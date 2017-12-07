---
title: 搞懂 JavaScript 原型鍊
date: 2017-12-06 08:40:01
tags:
- javascript
---

最近突然看到許多關於 js 原型鍊的介紹，這東西我從來沒搞懂過也沒認真想要搞懂過 XD
說真的好像不懂也不會影響甚麼，畢竟實戰上基本用不到這些比較底層的東西…
但是當作是邊緣冷知識來看看也是挺不錯的~

<!-- more -->

# 歷史

JavaScript，一個為了網頁互動而誕生的腳本語言，最早是因為 Netscape 開發了一個比較成熟的瀏覽器 Navigator，但由於沒有可以讓網頁與使用者互動的方式，所以他們就開發了 JavaScript 來當作網頁的腳本語言，其中主要開發者是 *Brendan Eich*。
由於當時物件導向正夯，Brendan Eich 也決定讓 JavaScript 所有東西都是 Object。
如此用途明確的語言，似乎不太需要非常完整的底層架構吧？用不著像 C++, Java 這種泛用式程式語言一樣完整，所以 Brendan Eich 並不打算引入 Class 的概念。但又由於JavaScript 所有東西都是 Object，勢必要有種方法做到類似**繼承**這件事。
所以原型鍊就出現了！

# JavaScript 語法背後的運作

JavaScript 要建構一個 instance 會用 `new` 關鍵字，但實際上這 `new` 跟 C++, Java 的不一樣。
JavaScript 的 new 其實後面接的是一個 function，類似於 C++ constroctor

```js
function Person(name) {
  this.name = name;
  this.sayHi = function () {
    console.log('Hi');
  };
}
  
var man1 = new Person('Jack');
var man2 = new Person('Andy');
  
console.log(man1.sayHi === man2.sayHi); // false
```

上面這段例子是 JavaScript 創造實例的方式。
可以看到 `Person` 中有兩個東西，一個是 name, 另一個是 Person 的 method `sayHi`，雖然這樣很好了，但是這樣 `man1`, `man2` 中其實包含了一樣的 `sayHi` function，浪費記憶體空間。

所以如果要做一個類別共用的方法可以這樣:

```js
function Person(name) {
  this.name = name;
}
  
Person.prototype.sayHi = function () {
  console.log('Hi');
};
  
var man1 = new Person('Jack');
var man2 = new Person('Andy');
  
console.log(man1.sayHi === man2.sayHi); // true
```

把類別共用的 function 寫在 `prototype` 中就可以達成共用的效果，而其實這個 `prototype` 就是原型鍊。

# 用原型鍊模擬繼承

我們用瀏覽器偵錯模式印變數的時候，相信經常看到 `__proto__` 藏在變數裡，那個東東就是原型鍊。
JavaScript 中有幾個預設的類別，像是 Object, Array 等等，我們在宣告變數的時候其實裡面都會藉由原型鍊 **串** 到預設的類別。

{% zoom /img/2017-12-06/01.PNG a 的 __proto__ 指向 Object %}

所以其實在創造實例時，JavaScript 會把 `__proto__` 指向他的原型，以空物件 `{}` 而言，就是預設類別 `Object`。
回到上面 Person 的例子，他的原型鍊就會是長這樣:

{% zoom /img/2017-12-06/02.PNG man 的 sayHi 是定義在他的 __proto__ 中  %}


可以發現寫在 `Person.prototype` 的 `sayHi` ，實際上是定義在 `man.__proto__.sayHi` ，也就是 Person 的原型，而在呼叫 `man.sayHi()` 時，由於找不到，所以 JavaScript 會藉由`__proto__`嘗試往上找，就會在 `man.__proto__` 中找到。

而這個一直往上一層原型找的過程，其實就模擬了繼承的效果。

# ES6 語法糖與原型鍊

雖說 JavaScript 當初沒有 Class 的概念，但在 ES6 中其實出現 class 關鍵字了，但其實這只是一個語法糖而已，可以藉由幾個例子發現 ES6 背後還是透過原型鍊來運作。

```js
class level1 {
  constructor() {
    this.x = 1;
  }
  
  getX() { return this.x; }
}
 
class level2 extends level1 {
  constructor() {
    super();
    this.y = 10;
  }
  
  getY() { return this.y; }
}
 
let l2 = new level2();
```

上面這個例子是用 ES6 寫的繼承小程式， level2 繼承 level1 。直接來看看創造出的實例 `l2` 裡面是什麼:

{% zoom /img/2017-12-06/03.PNG ES6 的繼承其實也是用原型鍊串起來的。 %}

又看到原型鍊了！
`l2` 的原型鍊串成這樣: `l2` → `level1` → `Object`。
看看 `getX`, `getY` 就會發現他們定義在不同層級，因為 `getX` 是父類別的方法，所以在原型鍊中的更上一層。
由此就可以看出 ES6 雖然有 class 關鍵字，但其實原理還是原型鍊。

# Reference

[1] [Javascript继承机制的设计思想](http://www.ruanyifeng.com/blog/2011/06/designing_ideas_of_inheritance_mechanism_in_javascript.html)
[2] [該來理解 JavaScript 的原型鍊了](http://blog.techbridge.cc/2017/04/22/javascript-prototype/)

----------

**雜談**
除了學校教的 C/C++ 以外，我似乎沒去搞懂過其他語言背後的邏輯，秉持者會用就好的心態活到現在(X
這次稍微理解原型鍊以後，好像又更了解一點 JavaScript 了呢～！
