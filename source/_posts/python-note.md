---
title: 一些 Python 筆記 
date: 2016-09-10 00:28:57
tags:
- note
- python
- opencv
---

最近的專案需要用到 [OpenCV](http://opencv.org/)，官方有提供 C++ 以及 Python 的版本。我以前都用 C++，這次想說來換換口味使用 Python 好了，如果用的順手以後就都這樣搭配著用(Python + OpenCV)。
說是這樣說，但其實我對 Python 根本一竅不通，從來沒在比較大的專案中使用過，所以新手如我自然就遇到很多坑(?)
<!-- more -->

我這次專案是 Python 2.7 + OpenCV 3.1。
安裝 OpenCV 一直都是很麻煩的事情，C++ 的免不了要自己 build，詳細的方法在我之前寫的[另一篇](https://ssarcandy.tw/2016/07/22/Setting-up-OpenCV-using-Cmake-GUI/)有教學；
而 Python 安裝 OpenCV 稍微簡單一點，把 `cv2.pyd` 放到 `C:\Python27\Lib\site-packages` 就可以了 <sup>[1]</sup>。
在 Mac/Linux 上更簡單，可以使用 [conda](https://www.continuum.io/) <sup>[2]</sup> 來幫你安裝。


---
好，接下來就是用到現在所做的一些筆記～

# Coding-style

Python 的 Coding-style 基本上就是參考 [PEP8](https://www.python.org/dev/peps/pep-0008/)，簡結一下重點:

- 縮排用空格
- 一行不要超過 80 個字元，超過就換行。
- 除了 ClassName 以外，一律用 snake_case 為命名規則。
- 文件首行要加上編碼，一般 `utf-8` 就是加上這行 `# -*- coding: utf-8 -*-`


# Division

Python2 的除法很特別，竟然只除到整數，意思就是 `5 / 2 = 2`，不過這其實就跟 C++ 一樣嘛，強制轉型一下就好:

```py
print(5 / 2)        # 會無條件捨去小數點，印出 2
print(5 / 2.0)      # 2.5
print(5 / float(2)) # 2.5
```

不過這樣好麻煩，有沒有一勞永逸的方法？
有！就是用神奇的 `__future__`

```py
# 在文件開頭處加上這行
from __future__ import division
```

__future__ 是 Python2 很特別的東西，感覺上就是抓 Python3 的功能來用，而這邊 `import division` 就是使除法的行為與 Python3 一致，詳細運作原理可以參考 [stackoverflow](http://stackoverflow.com/questions/7075082/what-is-future-in-python-used-for-and-how-when-to-use-it-and-how-it-works) 上的說法:
> The internal difference is that without that import, `/` is mapped to the `__div__()` method, while with it, `__truediv__()` is used.


# Class

網路上有許多宣告 Class 的教學，不過好像大部分的都不對或過時了。
在 Python2 中，Class 宣告方式如下：

```py class.py
class Foo(object):
    def __init__(self):
        self.bar1 = 'hello'
        self.bar2 = 'world'
  
    def hello_world(self):
        print(self.bar1 + ' ' + self.bar2)
  
    def __private_func(self):
        print('I am private function')
  
  
foo = Foo()          # new 一個新的 Foo
foo.hello_world()    # 不用帶任何參數
foo.__private_func() # 無法呼叫，會噴 Error: AttributeError: 'Foo' object has no attribute '__private_func'
```

- 第一行的 `object` 是必須的。
- `__init__` 這個 function 也是必須的，這是 Class Constructor。
- 每個 function 的第一個參數必須放 `self`，這與 C++ Class 中的 `this` 相似，基本上就是拿來存取**自己**用的。
  - 例如 `hello_world()` 中就有存取 `bar1` 跟 `bar2`，而在呼叫時 `self` 會被跳過。
- 如果要寫 private method <sup>[3]</sup>，就在 function name 前加上雙底線 `__`，如同上面的第 9 行處。


# Path

檔案路徑也是一個滿麻煩的事情，假設要讀一個檔案，一開始可能會這樣寫：

```py
cv2.imread('../data/foo.jpg') # cv2.imread 是 opencv 的讀圖函式
```

這樣當然可以讀的到，但當你換了一個工作環境，像是 Windows，這樣寫就炸了～(因為 Window 路徑是用反斜線 `\`)
Python 提供了個好工具 `os.path.join()`，簡單來說就是幫忙處理斜線。所以上面那個例子可以改寫成這樣：

```py
import os
cv2.imread(os.path.join('..', 'data', 'foo.jpg'))
```

這樣的寫法就可以順利地在各平台運作～！

# Function name and Variable name

每個程式語言都有保留字，像是 `for`, `while`, `if` 之類的都是常見的保留字，而 Python 也不例外，你可以在[這邊](https://docs.python.org/2.5/ref/keywords.html)看到全部的保留字。
而通常 function name 也跟保留字一樣不能當作變數名稱 <sup>[4]</sup>。
特別的是 Python 允許變數名稱與 function 名稱一樣，像是：

```py
sum = sum([1,2,3,4,5])  # sum() is built-in function for python
print(sum)              # 15
print(sum([1,2,3,4,5])) # 15
```

上面的例子可以看到，Python 能夠清楚的分辨這個 `sum` 是指變數還是內建函式。
javascript 就不行：

```js
btoa = btoa('hello')       // btoa() is built-in function for javascript
console.log(btoa)          // aGVsbG8=
console.log(btoa('hello')) // Uncaught TypeError: btoa is not a function
```

可以發現在第三行就噴錯了，因為 `btoa` 在第一行已經被蓋掉了，後面要用 `btoa()` 就會以為你是指那個變數，而變數當然不是 function 囉。


# The Zen of Python

Python 作者 Tim Peters 把一首詩藏在 `import this` 中，

>Beautiful is better than ugly.
>Explicit is better than implicit.
>Simple is better than complex.
>Complex is better than complicated.
>Flat is better than nested.
>Sparse is better than dense.
>Readability counts.
>Special cases aren't special enough to break the rules.
>Although practicality beats purity.
>Errors should never pass silently.
>Unless explicitly silenced.
>In the face of ambiguity, refuse the temptation to guess.
>There should be one-- and preferably only one --obvious way to do it.
>Although that way may not be obvious at first unless you're Dutch.
>Now is better than never.
>Although never is often better than *right* now.
>If the implementation is hard to explain, it's a bad idea.
>If the implementation is easy to explain, it may be a good idea.
>Namespaces are one honking great idea -- let's do more of those!

寫 Python 就是要追求乾淨、易讀、簡單，這也是我這幾周使用 Python 所感覺到的。
再引用 David 老師所言，
>寫 Python 就像是在寫 pseudo-code 一樣爽！


---
註:
[1] `cv.pyd` 可以在 build 好的 opencv 資料夾中找到。
[2] OpenCV 不能用 `pip` 安裝，而 `conda` 是類似 `pip` 的 Python 套件管理軟體。
[3] Python 是沒有 private function 的，只是在 runtime 藉由更改 function name 來達到這樣的效果，詳細可以參考[這篇](http：//stackoverflow.com/questions/17193457/private-method-in-python)。 
[4] 函式名子**不一定**不能當作變數名稱，在 C/C++ 中會有 Compile-time Error，在 javascript 中是可以的，但是會覆蓋其內容。
