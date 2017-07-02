---
title: vdb - Debugging visual programs
date: 2016-10-13 20:34:53
tags:
- pbrt
- c++
image: /img/2016-10-13/2.png
---

有時候在寫 [openGL](https://www.opengl.org/) 或者是類似 [pbrt](http://www.pbrt.org/) 這樣有牽涉到三維空間的程式的時候總是很難除錯...
雖然可以設斷點看看變數內容有沒有問題，但說實在的其實這樣看有時候根本看不出所以然，這樣還是難以除錯。

[vdb](https://github.com/zdevito/vdb) 是一個解決這樣問題的工具，它提供了很多常見的畫線、畫點等等函式，最重要的是他的易用性，可以在幾乎不更動程式碼的狀態下就完成偵錯。

<!-- more -->

## Usage

其實在 [vdb README](https://github.com/zdevito/vdb/blob/master/README.md) 已經說的滿清楚的了，這邊在整理一下:

1. 下載 `vdb-win.zip` 或 `vdb-osx.tar.gz`
2. 把 `vdb.h` include 進你要偵錯的程式
3. 執行 `vdb.exe` 或 `./vdb`
4. 在要偵錯的程式中，可以在任何地方插入 `vdb_line()` 等他所提供的函式


## Example

以 pbrt 為例，由於結果都是一張渲染完成的影像，說實在的這真的很難 debug....
那利用 vdb 這工具能有甚麼好處呢？

藉由他，可以很容易地畫出像是物體的樣子以及他的 Bounding Box，如圖：
{% zoom /img/2016-10-13/1.png heightfield object and its bounding box %}

---
或者是當你在算 Vertex normal 時，不知道到底算的對不對，也可以直接畫出來：
{% zoom /img/2016-10-13/2.png Showing Normals on vertices %}

---
我個人覺得 vdb 對我最大的幫助是 object space 以及 world space 之間的關係了，
坐標系一個沒弄好就會讓渲染的結果差異甚大，完全摸不著頭緒到底發生什麼事情.....

藉由 vdb 實際畫出各個 object 時候，很容易就發現 object/world space 之間的 bug
{% zoom /img/2016-10-13/3.png Bounding box 沒有正確的轉換到 object space，導致跑到怪怪的地方 %}


## Some tips

其實上面說的很簡單，但事實上我剛開始嘗試使用 vdb 時遇到了超多的問題，這邊就來記錄一下：

##### Header files order

`#include "vdb.h"` 要擺在哪裡？一般來說當然越上面越好，但還是有例外的：

```cpp heightfield.cpp
#include "stdafx.h"
#include "vdb.h"
#include "shapes/heightfieldImproved.h"
#include "shapes/trianglemesh.h"
#include "paramset.h"
```

以上面的例子來說，`#include "vdb.h"`必須放在 `#include "stdafx.h"`後面。
`stdafx.h`是來做 precompiled headers 用的，所以置於他之前的 include 都會被忽略，就會造成找不到 `vdb_line()` 之類的錯誤。

##### Use ONE thread

vdb 不支援多執行緒，如果在偵錯的程式是多執行緒的話，有可能會導致畫在 vdb 上的東西不正確(漏畫)。
解決方法就是在偵錯時使用單一執行緒。

##### Using winsock instead of winsock2

這問題應該是只在 Windows 會發生，並且在要偵錯的程式中使用到 `windows.h`。
vdb 中用到了 `winsock2.h`，這是跟 `socket` 有關的東西，
然而 `windows.h` 中也有 include 一個叫 `winsock.h` 的東西。
`winsock.h`, `winsock2.h` 有很多函式都各自有宣告，而同時引用兩者會造成 **redefinition** 錯誤。

解決方法是把 `vdb.h` 中，`winsock2.h`改成`winsock.h`。
詳細可查看 [stackoverflow 這篇](http://stackoverflow.com/questions/39849684/header-correct-but-compile-erroridentifier-not-found)