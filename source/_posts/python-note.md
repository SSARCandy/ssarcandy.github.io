---
title: 一些 Python 筆記 
date: 2016-09-10 00:28:57
tags:
- note
- python2
- opencv
---

最近的專案需要用到 [OpenCV](http://opencv.org/)，官方有提供 C++ 以及 Python 的版本。我以前都用 C++，這次想說來換換口味使用 Python 好了，如果用的順手以後就都這樣搭配著用(Python + OpenCV)。
說是這樣說，但其實我對 Python 根本一竅不通，從來沒在比較大的專案中使用過，所以新手如我自然就遇到很多坑(?)，而這篇就是在記錄一下這些坑~
<!-- more -->

我這次專案是 Python 2.7 + OpenCV 3.1。
安裝 OpenCV 一直都是很麻煩的事情，C++ 的免不了要自己 build，詳細的方法在[這篇](https://ssarcandy.tw/2016/07/22/Setting-up-OpenCV-using-Cmake-GUI/)有教學；
而 Python 的稍為簡單一點，把 `cv2.pyd` 放到 `C:\Python27\Lib\site-packages` 就可以了 [1]。在 Mac/Linux 上更簡單，可以使用 [conda](https://www.continuum.io/) [2] 來幫你安裝。


---
好，接下來就是用到現在發現的一些坑以及解法~
## Coding-style
Python 的 Coding-style 基本上就是參考 [PEP8](https://www.python.org/dev/peps/pep-0008/)，簡結一下重點:
- 縮排用空格
- 一行不要超過 80 個字元，超過就換行。
- 除了 ClassName 以外，一律用 snake_case 為命名規則。
- 文件首行要加上編碼，一般 `utf-8` 就是加上這行 `# -*- coding: utf-8 -*-`


## 除法
Python2 的除法很特別，竟然只除到整數，意思就是 `5 / 2 = 2`，不過這其實就跟 C++ 一樣嘛，強制轉型一下就好:
```py
print(5 / 2)        # 會無條件捨去小數點，印出 2
print(5 / 2.0)      # = 2.5
print(5 / float(2)) # = 2.5
```
不過這樣好麻煩，有沒有一勞永逸的方法？
有！就是用神奇的 `__future__`
```py
# 在文件開頭處加上這行
from __future__ import division
```
__future__ 是 Python2 很特別的東西，感覺上就是抓 Python3 的功能來用，而這邊 `import division` 就是使除法的行為與 Python3 一致，詳細運作原理可以參考 [stackoverflow](http://stackoverflow.com/questions/7075082/what-is-future-in-python-used-for-and-how-when-to-use-it-and-how-it-works) 上的說法:
> The internal difference is that without that import, `/` is mapped to the `__div__()` method, while with it, `__truediv__()` is used.


## Class
網路上有許多宣告 Class 的教學，不過好像大部分的都不對或過時了。
在 Python2 中，Class 宣告方式如下:

```py title:class.py
class Foo(object):
    def __init__(self):
        self.bar1 = 'hello'
        self.bar2 = 'world'
  
    def hello_world(self):
        print(self.bar1 + ' ' + self.bar2)
  
    def __private_func(self):
        print('I am private function')
```

其中，第一行的 `object` 是必須的。`__init__` 這個 function 也是必須的，這是 Class Constructor。
每個 function 的第一個參數必須放 `self`，這與 C++ Class 中的 `this` 相似，基本上就是拿來存取**自己**用的，例如 `hello_world()` 中就有存取 `bar1` 跟 `bar2`，而在呼叫時 `self` 會被跳過。
如果要寫 private method [3]，就在 function name 前加上 `__`，如同上面的第 9 行處。
```py
foo = Foo() # new 一個新的 Foo
foo.hello_world() # 不用帶任何參數
foo.__private_func() # 無法呼叫，會噴 Error: AttributeError: 'Foo' object has no attribute '__private_func'
```

## 路徑
## Reserved word(Keywords)
## 一些 Geek 做法

---

註一: `cv.pyd` 可以在 build 好的 opencv 資料夾中找到。
註二: OpenCV 不能用 `pip` 安裝，而 `conda` 是類似 `pip` 的 Python 套件管理軟體。
註三: Python 是沒有 private function 的，只是在 runtime 藉由更改 function name 來達到這樣的效果，詳細可以參考[這篇](http://stackoverflow.com/questions/17193457/private-method-in-python)。 
