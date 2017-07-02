---
title: pbrt - 用多點光源模擬環境光
date: 2016-12-18 01:45:08
tags:
- rendering
- pbrt
- c++
image: /img/2016-12-18/2.jpg
---

環境中總有一些背景光，像是太陽光、遠處大樓窗戶反光之類的，可以看成一整片不均勻分布的光源，有些地方亮；有些地方暗。
pbrt 中是用 important sampling 來渲染環境光，不過，其實也可以把環境光轉換成一堆點光源來計算。

{% zoom /img/2016-12-18/1.jpg %}
<!-- more -->
{% zoom /img/2016-12-18/4.jpg 不同的環境光會讓場景中物件有不同的渲染結果<sup>[1]</sup> %}



# Median Cut Alogrithm

直接來看一張圖:

{% zoom /img/2016-12-18/2.jpg 用 median-cut algorithm 把環境光轉成多點光源<sup>[2]</sup> %}

事實上這方法很簡單，就是將整張 environment light probe 切成 x 塊相同能量的區塊(x 是多少開心就好~)，整個邏輯可以分成幾步驟:

1. 初始狀態 = 整張 env light probe 影像（陣列中只有一個區域）
2. 對於每個區域，沿著長邊切成兩塊一樣能量的區塊
3. 如果區塊少於 x ，則繼續做 2.
4. 把點光源放在每個區域中的能量重心處

# 計算能量重心

能量重心計算其實就是 x, y 軸分別加權平均（權重為點能量）
點能量計算方式可以根據 RGB channel 加權平均來計算
eg. Y = 0.2125R + 0.7154G + 0.0721B 之類的加權法

# 計算區塊能量

直覺的想法其實就是這區塊中所有點能量和就是這區塊能量了。
不過在做 Median-cut 時期時會不斷需要計算區塊的能量，用這種暴力解會使效能突破天際的差。
這邊可以利用預先計算 environment light probe 的能量 Sum Area Table(簡稱 SAT)，概念很簡單:
一開始先維護一個能量累積的二維陣列，每個點的值就是其左上角區塊的能量和，藉由這個陣列可以使獲得任意區塊能量的時間複雜度為 O(1)。

{% zoom /img/2016-12-18/3.jpg 這張圖說明了若要獲得紅色區塊能量和，只需查表四次，計算 D-B-C+A 即可得出。 %}


# 結果

渲染出來的結果其實跟原本的環境光還是有些差別，畢竟是用多點光源來模擬環境光，本來就不會一模一樣。

{% zoom /img/2016-12-18/new-256-my.jpg Median cut algorithm %}
{% zoom /img/2016-12-18/new-256.jpg Important sampling(original) %}

不過在效能方面，用多點光源模擬所需要的運算時間大概都只有原本算法的 30% ，可以說是大幅加速了!

# 雜談

- 這次中間卡了一周跑去 SIGGRAPH ASIA，由於我懶沒帶電腦去，所以也就稍微趕了一點...(幸好這次比較簡單一點點...哈哈)
- 我學乖了，用 cmlab 工作站跑 pbrt 整個就是舒爽，Enter 按下去差不多就算完了~
- GA 累積人次快突破 5000 瀏覽了，不過發現還真的有人在看我的文章還是覺得很特別~哈哈
- 之前 group meeting 座前面學長一直在看我的 [realist-camera](https://ssarcandy.tw/2016/11/09/pbrt-realistic-camera/)，害我注意力都被吸走了 XD

---

註:
[1] 原圖來自 Physically Based Rendering, Second Edition
[2] 原圖來自 A Median Cut Algorithm for Light Probe Sampling, SIGGRAPH 2006