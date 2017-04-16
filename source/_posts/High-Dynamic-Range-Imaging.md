---
title: High Dynamic Range Imaging
date: 2017-04-16 01:34:44
tags:
- opencv
- python
---

> 高動態範圍成像（英語：High Dynamic Range Imaging，簡稱HDRI或HDR），在電腦圖形學與電影攝影術中，是用來實現比普通數點陣圖像技術更大曝光動態範圍（即更大的明暗差別）的一組技術。高動態範圍成像的目的就是要正確地表示真實世界中從太陽光直射到最暗的陰影這樣大的範圍亮度。
>    -- from wikipedia


由於一般數位相機的影像就是每個 pixel 8 bits，能夠表現的能量範圍就是這麼窄(過暴就全白，太暗就全黑)。
然而真實世界的能量範圍是非常廣的，為了能夠在 0~255 之間表現出最豐富的細節(亮部即暗部的細節)，才有所謂的 HDR 技術。
HDR Image 可以從多張不同曝光時間的照片中組合出來，而整個流程大致包含了:

1. 影像對齊
2. 計算出真實能量分佈
3. 把影像壓縮回低動態範圍成像(一般螢幕才能顯示)


<!-- more -->

# Image Alignment

拍攝時，即使有用腳架固定，也無法確保每張照片拍到的都完全沒有晃到，如果晃到的話，到時候的結果就會糊糊的。
所以，第一步就是要先對其各張影像。
我們可以以第一張照片為標準，其餘的照片都想辦法對齊他。

## Naïve Alignment

最 naïve 的演算法，就是在一個範圍內移動找出差值最小的offset，pseudo-code如下:

```py
offset = (0, 0)
difference = infinity
for y in [min..max]:
    for x in [min..max]:
        diff = find_diff(img[0], offset(img[i], (y, x))
        if diff < difference:
            difference = diff
            offset = (y, x)
```

如何訂 min, max 值是個難題，太大會效率差，太小可能會沒找最好的解。
不過依據我的經驗，拍攝的時候有搭配腳架以及快門線的話，其實誤差差不多都在 5 pixels 之間，所以可以把 $(min, max) = (-2, 2)$

## Median Threshold Bitmap

Median Threshold Bitmap Alignment<sup>[1]</sup> 演算法，是利用金字塔的方式(每層圖片都為上一層的四倍)從最小的開始比對，在九個鄰居內做移動，累計各方向的誤差選擇最小的方向移動之，再向上傳遞到兩倍的圖再做一次。基本上每一張都是去對齊第一張。

實作的流程大略如下:
1. 產生 binary-threshold image
這邊的閾值由影像的中位數值決定。

    {% zoom /img/2017-04-16/01.PNG 我實作的 MTB 所產生的 binary-threshold image %}

2. 產生 exclude mask
由於那些太接近閾值的像素有可能會造成誤差，故將太接近閾值的像素標示出來，在比對時就直接跳過不比對。
假設要忽略的是 **閾值 ± 10** ，可以用 opencv 的 `cv2.inRange()`達成

    ```py
    mask_img = cv2.inRange(img, median - 10, median + 10)
    ```
    {% zoom /img/2017-04-16/02.PNG 這是用於跳過過於接近閾值的像素的 MASK %}

3. 由最小至最大的順序比對影像差異
在每一個層級中，都是往九個鄰居移動，看哪個最小，再往上傳遞繼續做這個比對。
由於影像都是 binary image，所以要比對影像差異挺容易的:
影像差異 = `img1 XOR img2 AND mask`
越小層級的移動的權重越大。



# Construct HDR


由於一般數位相機的影像就是每個 pixel 8 bits，所以每台數位相機其實都有自己對應的 response curve
Response curve 是在決定接收到多少能量該轉成多少的值(此值是 [0~255])。
那我就可以透過多張不同曝光時間的影像來反推出這個 response curve，有了 response curve 之後就可以進一步算出真實能量分佈圖。

## Solving response curve

我建立 HDR 影像的方法為 1997 Debevec<sup>[2]</sup> 的方法。
由於論文很佛心的有提供 MatLab Code，所以我就直接拿他為基底改寫成 python 程式碼，
並利用 numpy 提供的 `np.linalg.lstsq(A, b)` 解 $Ax = b$ 的 $x$ 解。

我將 RGB channel 分別計算 response curve，並全部畫在一圖表上檢視，以下是我做的幾個例子。

<div style="display: flex; align-items: center;">
{% zoom /img/2017-04-16/memorial0062.png %}
{% zoom /img/2017-04-16/test-response-curve.png %}
</div><div style="display: flex; align-items: center;">
{% zoom /img/2017-04-16/DSC_0126.png %}
{% zoom /img/2017-04-16/street2-response-curve.png %}
</div>

另外，Debevec 論文<sup>[2]</sup>所提及的 $L$ (控制 response curve smoothness 程度)，並不好掌握最好的值，不過依據實驗 $L$ 值大約在 30~50 就還不錯。

---

關於 smaple 點的方式，我試了兩種:
1. **Random 取 50 個點**
好處是很直覺且容易實作，但我發現做出來的 response curve 有時會有很不一樣的結果，比較不可靠。以下圖為例，可以看到在綠色的 channel 就有比較怪異的結果，藍色在頂部也是怪怪的。

    <div style="display: flex; align-items: center;">
    {% zoom /img/2017-04-16/04.PNG Random sampling 50 points %}
    {% zoom /img/2017-04-16/05.PNG Response curve %}
    </div>

2. **把圖片縮成 10x10，全部拿去算**
由於縮小圖片基本上還是能保有圖片的特徵(特亮的、特暗之類的)，所以做出來的效果也比較好一點，左圖是縮放到 10x10 的影像，右為 response curve:

    <div style="display: flex; align-items: center;">
    {% zoom /img/2017-04-16/03.PNG Shrink original img to 10x10 and use all pixels %}
    {% zoom /img/2017-04-16/test-response-curve2.png Response curve %}
    </div>

所以最後我採用第二種方法。

## Construct radiance map

再藉由 Debevec 論文<sup>[2]</sup>上 Equation(6) 所提的 construct radiance map:
透過剛剛產生的 response curve 帶入公式來得到 radiance map。

$$
\ln E\_{i}=\dfrac {\sum \_{j=1}^{P} w\left( Zij\right) \left( g\left( Zij\right) -\ln \Delta t\_{j}\right)} {\sum \_{j=1}^{P} w\left( Zij\right)} 
$$

其中 $g$ 函式就是剛剛產生的 response curve。
有了 radiance map之後，就可以套用假色來顯示出真實能量分佈圖，以下是我做的幾的例子(這邊的值都是log value)

<div style="display: flex; align-items: center;">
{% zoom /img/2017-04-16/test-radiance-map.png %}
{% zoom /img/2017-04-16/taipei-radiance-map.png %}
</div><div style="display: flex; align-items: center;">
{% zoom /img/2017-04-16/street2-radiance-map.png %}
{% zoom /img/2017-04-16/living_room2-radiance-map.png %}
</div>

# Tone mapping

到此已經重建出 Radiance map 了，也就是已經知道真實能量分佈了，但這能量範圍太廣，沒辦法直接顯示到一般的顯示器上(0~255)
所以需要再把這樣**高動態範圍成像**壓回**低動態範圍成像**，不過這壓縮的方式有其學問，如何才能讓低動態範圍成像**看起來**像高動態範圍成像就是 Tone mapping 在做的事。

根據不同的 Cases，最適合的演算法不見得相同，所以就是要看情況決定。
這邊展示幾個 Tone mapping 之後的結果:

<div style="display: flex; align-items: center;">
{% zoom /img/2017-04-16/test-ashikhmin.jpg %}
{% zoom /img/2017-04-16/taipei-drago.jpg %}
</div><div style="display: flex; align-items: center;">
{% zoom /img/2017-04-16/street2-ashikhmin.jpg %}
{% zoom /img/2017-04-16/living_room2-gdc.jpg %}
</div>

# Result galleries

{% zoom /img/2017-04-16/living_room2-gdc.jpg Living room, tone map algroithm: gdc, Camera: Nikon D5000 %}
<div style="display: flex; align-items: center;">
{% zoom /img/2017-04-16/living_room2/DSC_0078.png %}
{% zoom /img/2017-04-16/living_room2/DSC_0079.png %}
{% zoom /img/2017-04-16/living_room2/DSC_0080.png %}
{% zoom /img/2017-04-16/living_room2/DSC_0081.png %}
</div><div style="display: flex; align-items: center;">
{% zoom /img/2017-04-16/living_room2/DSC_0082.png %}
{% zoom /img/2017-04-16/living_room2/DSC_0083.png %}
{% zoom /img/2017-04-16/living_room2/DSC_0084.png %}
{% zoom /img/2017-04-16/living_room2/DSC_0085.png %}
</div><div style="display: flex; align-items: center;">
{% zoom /img/2017-04-16/living_room2/DSC_0086.png %}
{% zoom /img/2017-04-16/living_room2/DSC_0087.png %}
{% zoom /img/2017-04-16/living_room2/DSC_0088.png %}
{% zoom /img/2017-04-16/living_room2/DSC_0089.png %}
</div>

---

{% zoom /img/2017-04-16/taipei-drago.jpg Taipei city, tone map algroithm: drago, Camera: Nikon D5000 %}
<div style="display: flex; align-items: center;">
{% zoom /img/2017-04-16/taipei/DSC_0058.png %}
{% zoom /img/2017-04-16/taipei/DSC_0060.png %}
{% zoom /img/2017-04-16/taipei/DSC_0061.png %}
{% zoom /img/2017-04-16/taipei/DSC_0062.png %}
</div><div style="display: flex; align-items: center;">
{% zoom /img/2017-04-16/taipei/DSC_0063.png %}
{% zoom /img/2017-04-16/taipei/DSC_0064.png %}
{% zoom /img/2017-04-16/taipei/DSC_0065.png %}
{% zoom /img/2017-04-16/taipei/DSC_0066.png %}
</div>

---

{% zoom /img/2017-04-16/street-drago.jpg Street, tone map algroithm: drago, Camera: Nikon D5000 %}
<div style="display: flex; align-items: center;">
{% zoom /img/2017-04-16/street/DSC_0099.png %}
{% zoom /img/2017-04-16/street/DSC_0098.png %}
{% zoom /img/2017-04-16/street/DSC_0097.png %}
{% zoom /img/2017-04-16/street/DSC_0096.png %}
</div><div style="display: flex; align-items: center;">
{% zoom /img/2017-04-16/street/DSC_0095.png %}
{% zoom /img/2017-04-16/street/DSC_0094.png %}
{% zoom /img/2017-04-16/street/DSC_0093.png %}
{% zoom /img/2017-04-16/street/DSC_0092.png %}
</div>

---

{% zoom /img/2017-04-16/street2-ashikhmin.jpg Street at night, tone map algroithm: ashikhmin, Camera: Nikon D5000 %}
<div style="display: flex; align-items: center;">
{% zoom /img/2017-04-16/street2/DSC_0123.png %}
{% zoom /img/2017-04-16/street2/DSC_0124.png %}
{% zoom /img/2017-04-16/street2/DSC_0127.png %}
{% zoom /img/2017-04-16/street2/DSC_0128.png %}
</div><div style="display: flex; align-items: center;">
{% zoom /img/2017-04-16/street2/DSC_0129.png %}
{% zoom /img/2017-04-16/street2/DSC_0131.png %}
{% zoom /img/2017-04-16/street2/DSC_0132.png %}
{% zoom /img/2017-04-16/street2/DSC_0133.png %}
</div>


# Reference

[1] Fast, Robust Image Registration for Compositing High Dynamic Range Photographs from Handheld Exposures, G. Ward, JGT 2003
[2] Recovering High Dynamic Range Radiance Maps from Photographs, Paul E. Debevec, Jitendra Malik, SIGGRAPH 1997

---

# 雜談

1. 結果說真的還是有不少人工的感覺，可能我太廢了吧...QQ
2. Latex 配 markdown 要注意該死的 `_`，在 Hexo 中底線會先被視為斜體字，所以在 Latex 中底線前面要用跳脫字元。
3. Hexo 的 markdown 真 robust! 愛怎亂搞都會跟預期中的一樣，也可以亂加 html 語法～(望向 github...
4. 這篇文章照片真多，竟然要下載 30MB 之多，超不 friendly der~