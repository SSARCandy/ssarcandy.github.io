---
title: Realistic camera in pbrt
date: 2016-11-9 13:14:41
tags:
- rendering
- pbrt
- c++
---

Ray-tracing 中的相機(眼睛)是所有光束的起點，從相機成像平面出發的光束如果能夠經由折射、反射等等最終到達光源的那些「存活」的光束，才對最終的影像有影響的光束。這種與現實物理相反的設計(從光源發出光並追蹤那些存活到相機成像平面的光束)是為了減少計算量。
{% zoom /img/2016-11-09/01.png ray-tracing 中，光束是從相機射出來的。[1] %}

<!-- more -->

# 實作真實相機光學系統

相機的光學系統決定了最終成像的樣貌，比如廣角、魚眼、正交投影等等樣貌， [pbrt-v2](https://github.com/mmp/pbrt-v2) 中實做了最常見的幾個，包含了 perspective camera, orthographic camera，原始程式碼在 `src/camera` 之下。

實際上的相機的光學系統通常都包含了多個透鏡，以此來達成比較複雜的成像(或是減少透鏡的像差)。
{% zoom /img/2016-11-09/02.png 真實相機通常都是由多片透鏡組成的光學系統。[2] %}

上圖是描述光學系統各個透鏡面的相關參數，從成像平面出發的 eye-ray 會在這個光學系統折射多次之後才會進入場景中，而這些光束又會跟場景的物件相交、反射等等，就如同[這篇](https://ssarcandy.tw/2016/10/10/pbrt-heightfield/)在做的事。

所以，要模擬真實相機的光學系統，其實就是幾個步驟：

1. 在成像平面上與第一個透鏡面上各取一點，相連產生 eye-ray
2. 找出 eye-ray 與第一個透鏡面的交點，沒交點就結束
3. 找出折射後的新 eye-ray
4. 重覆 2, 3 直到 eye-ray 離開光學系統進入場景為止

以 pseudo-code 表示，大概可以寫成這樣：

```py
filmP = random point on film
lensP = random point on first lens
ray.o = filmP
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

---
其實也可以借助一些除錯工具來視覺化光束的折射行為，這邊我使用 vdb 來畫出整個光學系統並且追蹤光束的折射行為。
(關於如何利用 vdb 除錯，可以參考[這篇](https://ssarcandy.tw/2016/10/13/debug-using-vdb/)。)
{% zoom /img/2016-11-09/03.png pbrt 模擬從成像平面中點發出光束，經過多次折射直至離開相機鏡頭。 %}

除此之外，也需要計算每條 ray 的權重，根據論文[2]所說是如下公式：

$E = A\frac{cos^4\theta}{Z^2}$

$A$: 出射瞳面積
$Z$: 最後透鏡與成像平面的距離
$\theta$: 光束與成像平面法向量夾角


# 結果

我嘗試渲染大張一點的圖並且讓每個像素的採樣夠多次，希望能夠讓結果圖漂亮一點。
代價就是一張圖要跑好幾個小時......

{% zoom /img/2016-11-09/05.png dobule-gauss 50mm with 512 samples per pixel(1024*1024) %}
{% zoom /img/2016-11-09/06.png wide 22mm with 512 samples per pixel(1024*1024) %}
{% zoom /img/2016-11-09/07.png telephoto 250mm with 512 samples per pixel(1024*1024) %}
{% zoom /img/2016-11-09/08.png fisheye 10mm with 512 samples per pixel(1024*1024) %}

# 加速

每個透鏡面基本上是以部份的球面來模擬，要求交點很容易，因為 `src/shape/shpere.cpp` 已經實做求交點了，可以直接創一個 Sphere object ，然後再 `s.Intersect(r, &thit, &rayEpsilon, &dg)` 來取得交點。

這樣寫簡單易懂，三兩下解決求交點這件事，但其實效能並不好，因為只為了求一個交點卻建構了一個完整的 shpere shape ，稍微有點浪費……

改善方式可以藉由複製貼上 `Shpere::Intersect()` 並加以改寫，就可以省去這樣的 overhead
實際上效能大約差 2 倍。

# 各種坑

- **RasterToCamera**
  在 `GenerateRay()` 中，`sample.imageX` `sample.imageY` 是在 Raster space 上，需轉至 Camera space，Raster/Camera space 之間關係如圖(省略 z 軸)，可以看出來轉換方式大概就是：上下翻轉、平移、縮小。
  {% zoom /img/2016-11-09/04.png Raster/Camera space 之間關係。 %}
- **Ray minT, maxT**
  在 `GenerateRay()` 中產生的 ray 記得參數要給好給滿，之前因為沒給值到 min/maxT 導致結果有坑坑巴巴的破圖...
- **Total reflection**
  我使用 [Snell's law](https://www.wikiwand.com/en/Snell's_law) 計算折射後的新方向，在公式中，若發生全反射時會讓其中一項產生虛數，程式就整個爆炸了。
  所以記得要注意別把負數開根號了。


---

 註:
 [1]: 圖片取自維基百科 [Ray-tracing](https://www.wikiwand.com/en/Ray_tracing_(graphics))
 [2]: A Realistic Camera Model for Computer Graphics, SIGGRAPH 1995
