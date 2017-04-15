---
title: High Dynamic Range Imaging
date: 2017-04-16 01:34:44
tags:
- opencv
- python
---

> 高動態範圍成像（英語：High Dynamic Range Imaging，簡稱HDRI或HDR），在電腦圖形學與電影攝影術中，是用來實現比普通數點陣圖像技術更大曝光動態範圍（即更大的明暗差別）的一組技術。高動態範圍成像的目的就是要正確地表示真實世界中從太陽光直射到最暗的陰影這樣大的範圍亮度。
>    -- from wikipedia

HDR Image 可以從多張不同曝光時間的照片中組合出來，而整個流程大致包含了:

1. 影像對齊
2. 計算出真實能量分佈
3. 把影像壓縮回低動態範圍成像(一般螢幕才能顯示)


<!-- more -->

# Image Alignment

## Naïve Alignment

另外其實我也有做最 naïve 的演算法，就是在一個範圍內移動找出差值最小的offset，pseudo-code如下:

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

不過如何訂 min, max 值是個難題，太大會效率差，太小可能會沒找最好的解。

## Median Threshold Bitmap Alignment

影像對其的部分我使用上課所講的MTB演算法，利用金字塔的方式(每層圖片都為上一層的四倍)從最小的開始比對，在九個鄰居內做移動，累計各方向的誤差選擇最小的方向移動之，再向上傳遞到兩倍的圖再做一次。基本上每一張都是去對齊第一張。

實作的流程大略如下:
[1]	產生 binary-threshold image
這邊的閾值由影像的中位數值決定。

[2]	產生 exclude mask
由於那些太接近閾值的像素有可能會造成誤差，故我將太接近閾值的像素標示出來，在比對時就直接跳過不比對。

[3]	由最小至最大的順序比對影像差異
在每一個層級中，都是往九個鄰居移動，看哪個最小，再往上傳遞繼續做這個比對。



# Construct HDR

## Solving response curve

## Construct radiance map

# Tone mapping

# Results