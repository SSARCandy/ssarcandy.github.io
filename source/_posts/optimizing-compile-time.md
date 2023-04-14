---
title: Optimizing C++ Compile Time
date: 2022-06-11 18:26:10
tags:
- c++
- cmake
---



編譯是靜態語言不可避免的步驟。對於開發者而言，編譯是個又愛又恨的東西，好處是他可以幫助在編譯時期找出部分的錯誤又可以幫忙最佳化，但是壞處則是編譯要時間，當專案越來越大時，小小改個檔案可能就要花數分鐘去等編譯。

{% zoom /img/2022-06-10/1.png source: https://xkcd.com/303/ %}

<!-- more -->

隨著 C++ 的發展，現在 modern C++ 如 C++14, 17 等等，新增了更多方式讓開發者在編譯時期完成更多事情，比如說更方便的`if contexpr`等等功能。而這其實也是被鼓勵的，因為能在編譯時期就處理完的話就可以讓 runtime 執行得更快！

但當大量使用 template 或引用更多的 library 也讓 compiler 的工作越來越多，而如果每改幾行就要等待編譯幾分鐘才能知道執行結果的話，對於一天要編譯數百次的開發者而言實在是太浪費生命了。

本篇文章就要來探討各種加速 C++ Compile Time 的方式，大部分的方法都是 Stack Overflow 搜刮來，然後由我自行實測。測試環境如下：

- Ubuntu 18.04 LTS
- GCC 9
- CMake 3.23
- Ninja 1.8
- Project LOC ~20k

# Use ccache

引入 [ccache](https://ccache.dev/) 絕對是效益最高的加速方式，完全不用改程式就可以減少大量的編譯時間。ccache 是一個全域的 compiler cache，藉由快取編譯的中繼檔來節省重新編譯的時間。安裝好以後只要在 `CMakeLists.txt` 中加入:

```bash
# CMakeLists.txt
SET_PROPERTY(GLOBAL PROPERTY RULE_LAUNCH_COMPILE ccache)
```

即可使用`ccache`，如果專案沒使用 build tools 的話，則是直接在`gcc`指令前加上`ccache`

```bash
# before
$ /usr/bin/gcc main.cpp
# after
$ ccache /usr/bin/gcc main.cpp
```

使用 ccache 之後整體編譯速度大約可以提升兩倍以上，十分讚！

# Use forward declaration as more as possible

C++ 的 `#include` 關鍵字其實就是複製貼上，所以當你在 A.h include 了 B.h，在預處理階段編譯器會把 B.h 內容複製到 A.h，而如果不幸的 B.h 又 include 一堆檔案，那也會通通展開。所以如果引用太多檔案，除了會造成預處理之後檔案肥大以外，也會造成檔案之間相依性混亂，間接導致每次編譯要重新編譯不必要的檔案。

除了將沒用的 include 清乾淨以外，還可以更激進的避免在 header include 東西，那就是利用 forward declaration。

{% zoom /img/2022-06-10/2.png include tree %}

試想以上情境，當你變更 A.h 時，A B C 都必須重新編譯，因為內容改變了，但實際上 C 並未使用到 A，其實應該可以避免重新編譯 C。

由於 C 會重新編譯是因為 B.h 內容改變了，而 B.h 內容改變的原因則是因為 A.h 更新了。這時候可以檢視為甚麼 B.h 需要引用 A.h，看看是否可以避免引用。

```cpp
/// B.h
#include "A.h"

class B {
 // ...skip
 private:
  const A& a;
};
```

以上是常見的使用情境，B 存了一個 class A 的參考`A& a`。

我們可以改寫成這樣，將 include 移至 B.cpp 實作檔中。這是因為`A&`, `A*`等這類東西的大小是固定的，所以在定義時不需要知道實際 class A 的大小，只需先告知 compiler 有這個 class 即可。

```cpp
/// B.h
class A; //< forward declare !
class B {
 // ...skip
 private:
  const A& a;
};

/// B.cpp
#include "A.h"
```

如此一來，當你變更 A.h 時，B.h 內容並不會改變，也就不會觸發 C 需要重新編譯拉，可喜可賀~

在大量使用這個技巧以後，我所測試的專案進步幅度也是非常明顯，更動 A.h 原本會牽動 54 個檔案需要重編譯，改完以後則只會牽動 29 個檔案，自然編譯速度也就變快了。

```bash
# before use fwd v.s. after use fwd
# -j 6 incremental build, w/o ccache, unit in second
[touch A.h]
before = 303 (trigger 54 files rebuild)
after  = 178 (trigger 29 files rebuild)
```

# Unity Build

Unity build 又稱 Jumbo build, Mega build，其原理是透過將`*.cpp`彙整成一個`all.cpp`再一起執行編譯，這樣就是省下 N 個檔案的編譯時間 (具體而言是省下如 template 展開等原本每個 Translate Unit 都要做的事情)。

CMake v3.16 開始就支援 [Unity Build](https://cmake.org/cmake/help/latest/prop_tgt/UNITY_BUILD.html#prop_tgt:UNITY_BUILD) 的設定，他支援將 batch size 個檔案先匯總成`all_x.cpp`之後再進行編譯。

不過這方法會遇到一些問題，由於這方法之原理說白了就是`cat *.cpp > all.cpp`如此暴力，如果專案本身常常使用全域變數的話，這會很容易導致 ODR (One definition rule) 錯誤。所以也有可能不容易引入 Unity Build。

這個技巧我認為也是 CP 值十分之高的方法，幾乎不用改程式 (如果專案用太多全域變數就要改很多😅) 卻可以獲得大幅的進步。我測試的結果如下，可以看到無論是 incremental build 還是 clean build 都取得 50% 以上的進步。

```bash
# w/o unity build v.s. with unity build (batch_size=8)
# using -j 6, w/o ccache, unit in seconds
[touch A.h]
before = 242 # 38 tasks
after  = 167 # 18 tasks

[clean build]
before = 420 # 111 tasks
after  = 224 #  47 tasks
```

# Better linker

編譯的最後階段是 linking，這部分可以替換成比較厲害的 linker，市面上目前有三種較有名的 linker

- ld (gcc default)
- gold
- lld

要替換使用 linker 只需要在 compile flag 加上`fuse-ld=<linker_name>`即可。詳細可參考 [gcc document](https://gcc.gnu.org/onlinedocs/gcc/Link-Options.html)。而我實測不同 linker 表現如下，

```bash
# rebuild using single thread, unit in second
# [1/1] Linking CXX executable main
[linker]
ld   = 25.4
gold = 11.6
lld  =  5.8
```

使用更強的 linker 雖然使 linking time 進步許多，但對整個專案的 compile time 而言其實佔比不是很大，相較於前面幾個章節算是進步較小的技巧。(但 CP 值也是很高，只要改一個 compile flag)

# Disable var-tracking for huge variable object

我們可以透過 gcc flag `-ftime-report`來剖析編譯各個階段的耗時，然後針對各個耗時大的改善。

我測試的專案中，有一個 auto-generate 的`unordered_map`，該檔案動輒數萬行，每次編譯該檔案都會成為瓶頸。從`-ftime-report`得知編譯該檔案耗時最大的部分是 var-tracking，var-tracking 是讓 debug info 有更多資訊的功能，但當專案中有巨大的變數時，這會讓 compiling 速度大幅變慢。

在對我那個數萬行的`unordered_map`檔案拿掉 var-tracking 之後 (針對該檔案加上一個`-fno-var-tracking`flag) 結果如下，

```bash
# gcc -ftime-report auto_gen.cpp
# with var-tracking v.s. without var-tracking, sorted by usr time
[before]
Time variable                                   usr           sys          wall               GGC
 phase opt and generate             : 122.95 ( 92%)   2.30 ( 35%) 125.26 ( 89%)  924305 kB ( 46%)
 var-tracking dataflow              :  71.39 ( 53%)   0.15 (  2%)  71.57 ( 51%)    3714 kB (  0%)
 expand vars                        :  17.55 ( 13%)   0.03 (  0%)  17.56 ( 12%)    8583 kB (  0%)
 phase parsing                      :   8.09 (  6%)   3.46 ( 53%)  11.55 (  8%)  794986 kB ( 40%)
 alias stmt walking                 :   6.11 (  5%)   0.08 (  1%)   6.40 (  5%)     678 kB (  0%)
 template instantiation             :   4.35 (  3%)   1.58 ( 24%)   6.03 (  4%)  443040 kB ( 22%)
 phase lang. deferred               :   2.30 (  2%)   0.72 ( 11%)   3.02 (  2%)  232700 kB ( 12%)
 var-tracking emit                  :   2.87 (  2%)   0.02 (  0%)   2.95 (  2%)   20420 kB (  1%)
 |overload resolution               :   3.18 (  2%)   1.26 ( 19%)   4.50 (  3%)  330116 kB ( 16%)
 TOTAL                              : 134.16          6.54        140.82        2005866 kB

[after]
Time variable                                   usr           sys          wall               GGC
 phase opt and generate             :  44.61 ( 80%)   1.41 ( 27%)  46.03 ( 76%)  724840 kB ( 41%)
 expand vars                        :  18.45 ( 33%)   0.02 (  0%)  18.46 ( 30%)    8567 kB (  0%)
 phase parsing                      :   8.32 ( 15%)   3.12 ( 59%)  11.45 ( 19%)  794986 kB ( 45%)
 alias stmt walking                 :   6.39 ( 12%)   0.11 (  2%)   6.52 ( 11%)     678 kB (  0%)
 template instantiation             :   4.38 (  8%)   1.44 ( 27%)   5.93 ( 10%)  443040 kB ( 25%)
 |overload resolution               :   3.27 (  6%)   0.97 ( 18%)   4.51 (  7%)  330116 kB ( 19%)
 phase lang. deferred               :   2.27 (  4%)   0.70 ( 13%)   2.97 (  5%)  232700 kB ( 13%)
 parser (global)                    :   1.89 (  3%)   0.90 ( 17%)   3.05 (  5%)  211250 kB ( 12%)
 tree SSA incremental               :   1.58 (  3%)   0.01 (  0%)   1.55 (  3%)     259 kB (  0%)
 TOTAL                              :  55.49          5.27         60.81        1761326 kB
```

結果是從原本耗時 134 秒降低至耗時 55 秒，減少超過 50% 的時間。這也使得該檔案不會再是整個專案的瓶頸。

# Summary

本文嘗試了許多技巧來加速編譯所需的時間，總結各點如下列：

- Use `ccache` <span style="color: green">**[big improvement]**</span>
- Use forward declaration as more as possible <span style="color: green">**[big improvement]**</span>
- Unity Build <span style="color: green">**[big improvement]**</span>
- Use LLVM linker <span style="color: orange">**[good improvement]**</span>
- Disable var-tracking for huge variable object <span style="color: orange">**[good improvement]**</span>
- Pre-compiled headers [no improvement]
- Explicit template instantiation [no improvement]

在爬文時網友提及 pre-compiled headers 以及 explicit (extern) template 也對減少編譯時間有幫助，但實測並未有顯著差異，故本文未提及，也許實際上是有用只是剛好不適用於我的環境之類的。

# References

1. [Improving Compilation Time of C/C++ Projects](https://interrupt.memfault.com/blog/improving-compilation-times-c-cpp-projects)
2. ["variable tracking" is eating my compile time!](https://stackoverflow.com/questions/2954473/variable-tracking-is-eating-my-compile-time)
3. [CMake Unity Build](https://cmake.org/cmake/help/latest/prop_tgt/UNITY_BUILD.html#prop_tgt:UNITY_BUILD)

{% ref_style %}
