---
title: Coherent Line Drawing
date: 2017-06-26 00:14:38
tags:
- c++
- opencv
- rendering
- paper
image: /img/2017-06-26/01.jpg
mathjax: true
---

線條藝術畫(line drawing) 是最簡單的一種視覺呈現圖畫的方式，僅僅是幾條線條即能清楚的表示出圖片中的物件。
這篇論文(Coherent Line Drawing' by Kang et al, Proc. NPAR 2007)提出一個全自動的方法，可以將相片轉換成簡單、高品質的線條畫風格圖片。

{% zoom /img/2017-06-26/01.jpg 輸入一張影像，即可產生出一張線條藝術風格畫。 %}

<!-- more -->

# Implementation

本篇論文的方法主要流程如下：

1. 由輸入影像產生邊緣向量流場
2. 反覆的精煉、平滑化邊緣向量流場
3. 藉由邊緣向量流場的資訊，對原圖套用高斯差以產生特徵線條

{% zoom /img/2017-06-26/02.jpg 整個方法的流程圖： 由原圖產生邊緣向量流場，再藉由流場資訊套用高斯差產生線條畫。 %}

## Edge Tangent Flow

由於線條畫的特性希望是能夠保留原圖重要的特徵邊緣，所以對應的邊緣向量流場(Edge Tangent Flow)必須滿足幾個條件：

1. 可以描述重要邊緣的流向。
2. 鄰近的向量必須要平滑(避免鄰近的向量方向差太多)，除非是角落。
3. 重要的邊緣必須要維持它原本的方向。

### Generate initial ETF

而本篇產生 ETF 的方法是藉由反覆的平滑化流場來得到一個符合上述各個條件的 ETF。
首先，藉由 原圖產生灰階梯度流場 (Gradient Vector Field)，再逆時鐘旋轉 90 度來 產生初始的邊 緣向量流場 (ETF)。

{% zoom /img/2017-06-26/03.jpg 對原圖做適當模糊後即可取得灰階梯度向量(GVF)，再旋轉 90 度可得一個初始的 ETF。 %}

### Refining ETF

再將這個初始的 ETF 做平滑化，方法如下：

$$
t^{new}=\\dfrac {1} {k}\\sum \_{y\in \\Omega \\left( x\right) }\\phi \\left( x,y\\right) t^{cur}\\left(y\\right)w\_{s}\\left( x,y\\right)w\_{m}\\left( x,y\\right)w\_{d}\\left( x,y\\right)
$$

其中，
\\(w\_{s}\\left( x,y\\right)\\) 是一個圓形 box filter function，落在外面的向量權重為零
\\(w\_{m}\\left( x,y\\right)\\) 為 magnitude weight function，用於確保重要的邊緣方向會被保留
\\(w\_{d}\\left( x,y\\right)\\) 為 direction weight function，用於使得鄰居的向量方向不會差距過大
\\(\\phi \\left( x,y\\right)\\) 則是當兩向量夾角過大時會反轉方向以確保夾角不會大於 90 度

透過以上的方法，只須要決定 kernel size 即可反覆平滑化 即可反覆平滑化 邊緣向量流場 直至夠平 滑為止 。

{% zoom /img/2017-06-26/04.jpg 由左至右：原圖、用 GVF 得到之初始 ETF、經過一次平滑化、經過兩次平滑化。 kernel size=7 %}

## Line construction

有了 ETF 之後就可以進入下一步：產生線條。
比起一般邊緣偵測的方法如 Sobel、Canny 等等固定 kernel size，這篇論文的方法則是使用 flow-based kernel ，也就是 kernel 會沿著流場有著不一樣的形狀。

{% zoom /img/2017-06-26/05.jpg (a)原圖、(b)ETF、(c)沿著流場的 kernel。<sup>[1]</sup> %}

### Flow-based Difference-of-Gaussians

根據 flow-based kernel 來進行 Difference-of-Gaussians(DoG) ，藉此來找出足夠符合重要線條的像素們。

{% zoom /img/2017-06-26/06.jpg (d)kernel 詳細圖示、(e)高斯差示意圖。<sup>[1]</sup>  %}

首先先對每個像素沿著 ETF 垂直方向做一維的 DoG，亦即對圖中 -T~T 做 DoG：

$$
F\\left( s\right) =\\int \_{-T}^{T}I\\left( l\_{s}\\left( t\\right) \\right) f\\left( t\\right) dt
$$

其中 \\(f\\left( t\\right) = G\_{\sigma\_{c}}\\left( t \\right)-\rho G\_{\sigma\_{s}}\\left( t \\right)\\) 就是高斯差的部分。

再來再沿著 -S~S 做一維的高斯加權：

$$
G\\left( x\right) =\\int \_{-S}^{S}G\_{\sigma}\\left( s \\right) F\\left( s\\right) ds
$$

這樣的方法除了可以使邊緣更有一致性(不會有太多短線)並且又可以抑制雜訊，使得產生出的結果很符合線條畫的特性。這即是這篇所提出的 Flow-based Difference of Gaussians(FDoG)。

### Iterative FDoG filtering

有時候做一次 FDoG 效果並不夠好，所以可以藉由反覆做 FDoG 來達到更良好的效果。
要反覆套用 FDoG 也很容易，只要將原圖與 FDoG 的輸出疊合，然後以這新的圖片當作原圖再次套用一次 FDoG 即可。

{% zoom /img/2017-06-26/07.jpg 藉由將結果疊合回原圖再做一次 FDoG，可以使的結果品質越來越好。 %}

實作上也很簡單，就是把結果的黑色部分直接覆蓋在原圖然後拿這再做 FDoG。注意雖然原圖改變了，但是使用的 ETF 並沒有重新計算。

```c++
/**
 * Superimposing the black edge pixels of the previous binary output
 * upon the original image
 */
for (int y = 0; y < originalImg.rows; y++) {
    for (int x = 0; x < originalImg.cols; x++) {
        float H = result.at<uchar>(y, x);
        if (H == 0) {
            originalImg.at<uchar>(y, x) = 0;
        }
    }
}
```

# Results

基本上圖片在 512x512 左右的大小可以在 3 秒內產生結果，若平行化則即使是更大張的圖片也可達到 real time。

<div style="display:flex; align-items:center;">
{% zoom /img/2017-06-26/08.jpg 輸入影像。由左上至右下：蔣公、廟、燈塔、老鷹。 %}
{% zoom /img/2017-06-26/09.jpg 輸出結果。由左上至右下：蔣公、廟、燈塔、老鷹。 %}
</div>

# Source code

You can find my implementation source code at [github](https://github.com/SSARCandy/Coherent-Line-Drawing)  
Or download pre-build version [here](https://github.com/SSARCandy/Coherent-Line-Drawing/releases)

{% zoom /img/2017-06-26/10.jpg Screenshot of my system user interface %}

# References

1. Image from 'Coherent Line Drawing' by Kang et al, Proc. NPAR 2007

{% ref_style %}