---
title: Realistic camera in pbrt
date: 2016-11-9 13:14:41
tags:
- rendering
- pbrt
- c++
---

Ray-tracing 中的相機(眼睛)是所有光束的起點，從相機成像平面出發的光束如果能夠經由折射、反射等等最終到達光源的那些「存活」的光束，才對最終的影像有影響的光束。這種與現實物理相反的設計(從光源發出光並追蹤那些存活到相機成像平面的光束)是為了減少計算量。

  {% fancybox /img/2016-11-09/01.png ray-tracing 中，光束是從相機射出來的。 %}

<!-- more -->

相機的光學系統決定了最終成像的樣貌，比如廣角、魚眼、正交投影等等樣貌， [pbrt-v2](https://github.com/mmp/pbrt-v2) 中實做了最常見的幾個，包含了 perspective camera, orthographic camera，原始程式碼在 `src/camera` 之下。

實際上的相機的光學系統通常都包含了多個透鏡，以此來達成比較複雜的成像(或是減少透鏡的像差)。

  {% fancybox /img/2016-11-09/02.png 真實相機通常都是由多片透鏡組成的光學系統。 %}

上圖是描述光學系統各個透鏡面的相關參數，從成像平面出發的 eye-ray 會在這個光學系統折射多次之後才會進入場景中，而這些光束又會跟場景的物件相交、反射等等，就如同 這篇 在做的事。

所以，要模擬真實相機的光學系統，其實就是幾個步驟：

1. 在成樣平面上與第一個透鏡面上各取一點，相連產生 eye-ray
2. 找出 eye-ray 與第一個透鏡面的交點，沒交點就結束
3. 找出折射後的新 eye-ray
4. 重覆 2, 3 直到 eye-ray 離開光學系統進入場景為止

```py
originP = random point on film
lensP = random point on first lens
ray.o = originP
ray.d = Vector(lensP - originP)

for l in lens:  # from rear to front
  intersectionP = l.intersect(ray)
  if not intersectionP: 
    return 0
    
  newDirection = l.refractRay(ray)
  if not newDirection:
    return 0
  ray.d = newDirection
```

  {% fancybox /img/2016-11-09/03.png pbrt 模擬從成像平面中點發出光束，經過多次折射直至離開相機鏡頭。 %}

除此之外，也需要計算每條 ray 的權重，根據論文所說會是如下公式：

公式


## 結果
## 加速

每個透鏡面基本上是以部份的球面來模擬，要求交點很容易，因為 `src/shape/shpere.cpp` 已經實做求交點了，可以直接創一個 Sphere object ，然後再 `s.Intersect(r, &th, &rayEpsilon, &dg)`

這樣寫簡單易懂，三兩下解決求交點這件事，但其實效能並不好，因為只為了求一個交點卻建構了一個完整的 shpere shape ，稍微有點浪費……

改善方式可以藉由複製貼上 `shpere.cpp` `Intersect()` 並加以改寫，就可以省去這樣的 overhead
實際上效能大約差 2 倍

## 各種坑
- raster2camera
- ray mint, maxt
- n = 0
- total reflection

