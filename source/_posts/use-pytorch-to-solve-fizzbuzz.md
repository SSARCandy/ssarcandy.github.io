---
title: Use PyTorch to solve FizzBuzz
date: 2018-01-15 01:13:49
tags:
- machine learning
- python
- pytorch
---


FizzBuzz 是一個常見的程式考題，題目很簡單，就是給一個整數，如果可以被 15 整除就回傳 FizzBuzz；可以被 3 整除就回傳 Fizz；被 5 整除就回傳 Buzz；都不能整除就回傳原本的數字。

用 Python 可以簡單幾行就寫出來：

```py
def fizz_buzz(num):
    if num % 15 == 0:
        return 'FizzBuzz'
    elif num % 3 == 0:
        return 'Fizz'
    elif num % 5 == 0:
        return 'Buzz'
    else:
        return str(num)
```

不過有狂人就把這當作分類問題，用 tensorflow 來解這個問題，原文[在此](http://joelgrus.com/2016/05/23/fizz-buzz-in-tensorflow/)，是篇很有趣的文章 XD

<!-- more -->

由於原文是用 tensorflow 實作，我想我就來寫個 PyTorch 版練習一下吧！
基本上就是把 FizzBuzz 當作分類問題 (Classification) 來訓練，要做的事大概有這些：

1. 準備 training, testing data
2. 定義 model
3. Training

那就來一步一步看看

# 準備資料

雖然 FizzBuzz 輸入是一個整數，但是把他轉成二進位會比較好訓練，所以先來寫個轉二進位的函式：

```py
  def encode(num):
      return list(map(lambda x: int(x), ('{:010b}').format(num))) 
```

因為我不想 `import numpy`，所以這邊轉二進位的方式是用 Python 的 format 來做。

另外還要把 FizzBuzz 改寫成回傳分類號碼：

```py
def fizz_buzz(num):
    if num % 15 == 0:
        return 0 # 'FizzBuzz'
    elif num % 3 == 0:
        return 1 # 'Fizz'
    elif num % 5 == 0:
        return 2 # 'Buzz'
    else:
        return 3 # num
```

接下來要來產生資料拉

```py
def make_data(num_of_data, batch_size):
    xs, ys = [], []
    for _ in range(num_of_data):
        x = random.randint(0, 2**DIGITS-1)
        xs += [encode(x)]
        ys += [fizz_buzz(x)]
    return xs, ys
```

由於 training 的時候通常會是一批一批 (batch) 下去訓練的，所以在準備資料時就先一批一批放在一起會比較方便。

所以改一下，

```py
def make_data(num_of_data, batch_size):
    xs, ys, data = [], [], []
    for _ in range(num_of_data):
        x = random.randint(0, 2**DIGITS-1)
        xs += [encode(x)]
        ys += [fizz_buzz(x)]
    for b in range(num_of_data//batch_size):
        xxs = xs[b*batch_size:(b+1)*batch_size]
        yys = ys[b*batch_size:(b+1)*batch_size]
        data += [(xxs, yys)]
    return data
```

前置步驟都弄好之後，終於可以來產生訓練跟測試資料拉，Batch size 就訂個 32 好了：

```py
training_data = make_data(1000, 32)
testing_data = make_data(100, 32)
```

# 定義 Model

其實我對於如何設計 model 還是沒有很了解，不過這問題應該是挺簡單的，弄個幾層 fully-connected layer 應該就夠了吧?

```py
class FizzBuzz(nn.Module):
    def __init__(self, in_channel, out_channel):
        super(FizzBuzz, self).__init__()
        self.layers = nn.Sequential(
            nn.Linear(in_channel, 1024),
            nn.ReLU(), # Activation function
            nn.Linear(1024, 1024),
            nn.ReLU(), # Activation function
            nn.Linear(1024, out_channel)
        )
 
    def forward(self, x):
        x = self.layers(x)
        return x
 
# Input 10 digits vector (binary format), output 4 classes vector
model = FizzBuzz(10, 4)
```

我用了一層隱藏層，1024 個神經元，activation function 則都是最基本的 ReLU 。
`in_channel`, `out_channel` 分別是輸入數字是長度多少的二進位 (10)，以及輸出幾種分類 (4)。
PyTorch 的 model 是繼承 `torch.nn.Module` 來寫個 class，通常只要定義 `__init()__` 跟 `forward()`就好，如果要自己做特殊的 backward 的話，也可以實作 `backward()`。

# Training

整個訓練的過程基本就是按照一般的分類問題流程做，把資料丟進 model 的到預測，把預測跟正確答案做 cross entropy 當作 loss ，然後去最小化這個 loss

用 PyTorch 寫大概是這樣：

```py
def training(model, optimizer, training_data):
    model.train()
    for data, label in training_data:
        data = Variable(torch.FloatTensor(data))
        label = Variable(torch.LongTensor(label))
        optimizer.zero_grad() # Clear gradient
        out = model(data) # predict by model
        classification_loss = F.cross_entropy(out, label) # Cross entropy loss
        classification_loss.backward() # Calculate gradient
        optimizer.step() # Update model parameters
```

由於 要是 `Variable` 才能自動算 back propagation ，所以 data 跟 label 都要變成 `Variable`。
這邊我用的 optimize 方法是 Stochastic Gradient Descent (SGD)，記得每次都要先清空 gradient 再做 backward。

# Result

萬事皆備，可以開始來看看結果如何了，來 train 300 個 Epoch 好了，

```
==== Start Training ====
Epoch  50/300, Loss: 0.78973, Accuracy: 64.58%
Epoch 100/300, Loss: 0.29299, Accuracy: 91.67%
Epoch 150/300, Loss: 0.14616, Accuracy: 93.75%
Epoch 200/300, Loss: 0.10606, Accuracy: 96.88%
Epoch 250/300, Loss: 0.09937, Accuracy: 96.88%
Epoch 300/300, Loss: 0.06472, Accuracy: 98.96%
```

哇！才 98% 準確率呢… 拿去 online judge 解題大概不會過呢 XD

----------

如果想要玩玩看我的 code，這邊可以看：
https://github.com/SSARCandy/pytorch_fizzbuzz