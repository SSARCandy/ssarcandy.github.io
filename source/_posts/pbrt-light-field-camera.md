---
title: Light Field Camera
date: 2017-01-18 19:04:29
tags:
- pbrt
- rendering
- python
- c++
image: /img/2017-01-18/02.png
mathjax: true
---



一般傳統相機都是先對焦好之後拍攝照片，而往往會有些照片事後才發現竟然沒對好焦，甚是可惜。而光場相機(light field camera)，有別於一般傳統相機，是可以記錄相機內部的光線傳輸方向等信息的相機；光場相機就是比傻瓜相機還傻瓜的相機，允許再拍攝後根據拍攝者的需要再重新聚焦到任意的位置光場相機可以做到先拍攝，後對焦這種神奇的事情。

光場相機其實是在相機主鏡頭後面加了一層微透鏡陣列，讓原本聚焦的光再次分散到各個感光點上，如圖一：

{% zoom /img/2017-01-18/01.png 圖一：在成像平面前加一個微透鏡的陣列。微透鏡陣列的平面在這裡是 st 平面。在微透鏡陣列後面的感光元件上，每一個像素對應著 uv 平面上一個區域射到此像素對應的微透鏡上光強的和。圖源<sup>[1]</sup> %}

<!-- more -->

光場相機每個像素紀錄的則是只有一條光線。由於光場相機這樣的設計，所以光場相機所拍出的原始影像很特別，會是一格一格的，如圖二所示。

{% zoom /img/2017-01-18/02.png 圖二：光場相機所拍出的原始影像是一格一格的。 %}

這是因為微透鏡陣列對主透鏡聚集的光再成像的緣故，每一格都是對應的微透鏡的成像。事實上，可以把每個微透鏡都當作一個小小針孔相機，如圖三(c)所示。

另外，藉由對這些微透鏡影像的重新排列，可以生成不同視角的影像。具體來說，就是挑選每個微透鏡的同一格像素，組合出一張長寬分別等同於微透鏡在長邊以及寬邊的數量的影像。而一張光場相機原始影像能夠產生多少不同視角的影像，端看每個微透鏡後面對應到的像素有幾個。

{% zoom /img/2017-01-18/03.png 圖三：(a)把每個微透鏡相同位置的像素取出來合成一張圖，可以得出不同視角的影像。(b)由光場影像得出的所有視角一覽。(c)每個微透鏡可以視為一針孔相機。 %}

# 數位重對焦

我以之前做的{% post_link pbrt-realistic-camera 真實相機系統 %}為基礎，在主透鏡焦距上放置微透鏡陣列，藉此來模擬光場相機的硬體設備。
光場相機原始影像紀錄了四維的光線資訊，\\(L(u, v, s, t)\\) 這個函式代表從主透鏡的 2D 點 \\((u, v)\\) 射到微透鏡的 2D 點 \\((s, t)\\) 的光線能量，利用這個資訊，就可以進行數位重對焦。關於如何進行數位重對焦，可以看圖四。

{% zoom /img/2017-01-18/04.png 圖四：在 s' 平面重新聚焦，即是讓所有光錐都落在 s' 平面上，而對於數位重對焦而言，必須透過蒐集ｓ平面上的資訊來達成。圖源<sup>[2]</sup> %}

原始焦距的比例。假設要重對焦影像至 \\(s'\\) 平面，可以由已知算出：

\\( s'=as+\left( 1-a\right) u\\)

不過由於光線能量函式是 \\(L(u, v, s, t)\\) ，所以必須把 \\(s'\\) 改寫成 \\(s\\) 的形式：

\\( s=\dfrac {1} {a}\left( s'-\left( 1-a\right) u\right) \\)

所以對於一個重對焦影像的像素而言，能量可以這樣求得：

\\( E\left(s', t'\right) = \sum \_{u} \sum \_{v} L\left(u, v, \dfrac {1} {a} \left(s' - \left(1 - a \right) u\right), \dfrac {1} {a} \left( t'-\left(1-a\right) v\right) \right) \\)

其實應該要寫成積分形式才是真實狀況，但是由於真正得到的資料是離散的(像素)，所以用加總的就可以了。

# 結果

我分成兩塊實作:

- 模擬光場相機成像，這部分是以 pbrt 為基礎再加新的 class 來實作。
- 利用光場相機的原始影像來做數位重對焦，這部分就是另外用 python 來做。
 
這樣做也使得我在驗證時可以分別驗證，讓實作上除錯較為容易。

模擬光場相機的部分，我也是用之前的場景檔為基礎，加以更改後來測試我的模擬效果。微透鏡的數目越多能使之後數位重對焦的影有更高的畫質，而微透鏡的大小則關係著能夠有多少不同的視角（亦即重對焦能力的高低）。

{% zoom /img/2017-01-18/05.png 圖五：(a)微透鏡大小較大，但數位重對焦以後會是比較低畫質的影像。(b) 微透鏡大小較小，數位重對焦以後會是比較高畫質的影像。 %}
{% zoom /img/2017-01-18/06.png 圖六：數位重對焦結果。左上、右上、左下、右下分別對焦點為：遠、中、近、更近。四張皆裁切掉上方黑色區塊。 %}

由圖六可以看出焦距的改變影響清楚的部分，雖然其實沒有十分明顯，但還是可以看到右上角的圖清楚的部分是紅龍的背部及尾部，而左下清楚的則是藍龍的背部。

另外，利用光場相機的原始影像來做數位重對焦的部分除了拿我自己產生出的光場相機影像來試驗以外，我也利用網路<sup>[5]</sup>直接尋找了一張光場相機的影像，並直接拿來當作我數位重對焦的測試資料，這是九個不同字母分別在不同的距離處。可以看見成功的對焦到不同的字母上。

{% zoom /img/2017-01-18/07.png 圖七：(a)從網路<sup>[5]</sup>上獲得的第三方光場相機原始影像。(b)用(a)來測試我實作的數位重對焦，可以看見成功的對焦到不同的字母上。 %}

# 雜談

- 其實自己模擬出來的光場影像做數位重對焦的時候效果一直不太理想，搞不懂是哪邊有問題QQ
- 不過用別人的光場影像做數位重對焦很成功阿，肯定是 pbrt 那邊我寫錯了什麼...
- 多虧有 CMLab 的眾多強力工作站，讓我免於跑一張圖就要浪費十幾個小時的時間...
- 查資料一直看到 Lytro 的開箱文....
- markdown + latex 還真多要注意的，markdown 的`_`會先被轉成`<em>`然後像是`\sum _{u}`的 latex 就會變成`\sum <em>{u}`...

---

# References
1. [Light Field Photography with a Hand-held Plenoptic Camera](http://graphics.stanford.edu/papers/lfcamera/), R Ng, M Levoy, M Brédif, G Duval, M Horowitz, P Hanrahan
2. [CS348b Project： Light Field Camera Simulation](https://graphics.stanford.edu/courses/cs348b-competition/cs348b-14/second_report.pdf), Zahid Hossain, Adam Spilfogel Backery, Yanlin Chen
3. [Fourier Slice Photography](http://graphics.stanford.edu/papers/fourierphoto/), Ren Ng, ACM Transactions on Graphics, July 2005
4. [The (New) Stanford Light Field Archive](http://lightfield.stanford.edu/lfs.html)
5. [光場相機原理及仿真實現](http://blog.csdn.net/endlch/article/details/44539055)
6. [LYTRO Light Field Camera 原理解析](https://phychai.wordpress.com/2011/06/24/lytro-light-field-camera/)

{% ref_style %}

$$$$