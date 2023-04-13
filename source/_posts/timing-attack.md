---
title: Timing Attack in String Compare
date: 2020-01-29 19:28:29
tags:
- c++
- note
mathjax: true
---


程式語言通常在執行的時候，為了要最佳化執行的速度，常常會利用所謂的 Early Return。<sup>[1]</sup>
比如說條件式裡面 `if (a && b)` 這種判斷式，假設已經知道 A == false，那其實就可以不需要知道 b 的值，如此就可以直接忽略 b 而達到更快的知道這個判斷式是否為真<sup>[2]</sup>。
同樣的這種作法其實會發生在很多地方，比方說像是比對兩個字串是否一樣：在很多程式語言中的實作其實就是遍歷兩個字串比對每一個字元，那只要過程中有一個字元不一樣那這兩個字串肯定就是不一樣，即可提早返回結果。
<!-- more -->

底下是 C 的 `strcmp` [程式碼片段](https://code.woboq.org/userspace/glibc/string/strcmp.c.html)實作比較兩個字串是否一樣：

```cpp
int strcmp(const char *p1, const char *p2)
{
  const unsigned char *s1 = (const unsigned char *) p1;
  const unsigned char *s2 = (const unsigned char *) p2;
  unsigned char c1, c2;
  do
  {
    c1 = (unsigned char) *s1++;
    c2 = (unsigned char) *s2++;
    if (c1 == '\0')
      return c1 - c2;
  }
  while (c1 == c2);
  return c1 - c2;
}
```

從上面的邏輯可以看出來，如果第二個字元就不一樣的話，那我們馬上就可以結束整個邏輯然後返回兩個字串不一樣的結果，如此就能提升程式執行的速度。
而本文就是要來探討這種字串比對的方式所衍生的其他的安全性問題，也就是所謂的 Timing Attack

# Timing Attack

> Timing Attack 其實就是所謂的時間差攻擊。

```cpp
do
{
  c1 = (unsigned char) *s1++;
  c2 = (unsigned char) *s2++;
  if (c1 == '\0')
    return c1 - c2;
}
while (c1 == c2);
```

再來看一下剛剛字串比對的實作中的迴圈，由於這個迴圈實作的關係我們可以知道不同字串比對其實會花不一樣的時間，這很合理因為有時候比較字串到一半的時候我們就已經知道這兩個字串不一樣，所以提早返回結果。
那這樣到底有什麼安全性的問題呢？

試想，今天在輸入密碼的時候輸入錯了，結果電腦告訴你：「喔你第三個字元錯了。」
這樣其實蠻奇怪的吧？這表示假設駭客想要猜你的密碼，基本上他就可以先亂猜第一個字元，猜對之後再繼續猜一個字元...以此類推，那勢必可以破解密碼。

這個例子跟我們剛剛的字串比對其實基本上是同一件事情，因為如果你輸入密碼是**錯的**其實會比輸入**正確**密碼來的**花更少的時間**，因為錯誤密碼可能前幾個字元就錯所以提早返還結果。
雖然這時間上的差異幾乎微乎其微，但是只要多做幾次然後再平均一下，還是可以得出有意義的結果。
底下是一段程式碼來證明，只要多跑幾次就可以發現字串中不一樣的那個字元如果越後面字串比對的時間就會明顯有差異，利用這樣的資訊就可以慢慢推出答案的字串。

```cpp
std::vector<std::string> str{
    "x2345",
    "1x345",
    "12x45",
    "123x5",
    "1234x",
};
 
for (auto ss: str) {
    auto start = std::chrono::system_clock::now();
    for (int i = 0; i < 1e8; i++) {
        strcmp("12345", ss.c_str());
    }
    std::chrono::duration<double> diff{std::chrono::system_clock::now() - start};
    std::cout << ss << ": " << diff.count() << " s\n";
}
```

這段程式會吐出以下的結果：

```
x2345: 4.07176 s
1x345: 4.89044 s
12x45: 5.79689 s
123x5: 6.84836 s
1234x: 7.37571 s
```

可以發現，比較的字串越後面才不一樣，花費越長的時間。這就是 Timing Attack 的主要概念。


# In Real World

那在實務上這個漏洞會出現在哪裡呢？
其實要先知道這個漏洞的意義：必須要是那個答案字串是敏感資料，像是密碼、或者某種 Token。 如果不是敏感資料那就算可以間接猜出來也是沒有什麼意義。

## Account/Password Login

那就先來說說看最常見的密碼比對好了，現在隨處可見什麼帳號密碼登入，這種東西會不會踩到這個漏洞呢？就我的知識來講：基本上是不會。
因為假設是一個正常的後端工程師，他們不會去做所謂的密碼明文儲存。密碼這種東西即使在資料庫裡面也不會是明文儲存的，少說也是會經過一次雜湊而且還要加鹽。<sup>[3]</sup>

$$
hash = H(password + salt)
$$

在資料庫存的會是 \\(hash\\) 而非 \\(password\\) 。

使用者輸入帳號密碼的時候，伺服器端會透過同樣的雜湊邏輯，就可以得出跟資料庫儲存的一樣的雜湊，這樣就完成一個正常的密碼驗證。
也由於 hashing 會讓輸入的字串跟得到的雜湊有很不一樣的結果，即使只改輸入的密碼一個字元，得到的 hash 也會完全不一樣。這樣的機制導致 Timing Attack 在這個例子上就完全沒有用了，因為攻擊者根本不能預期真正在做字串比對的那個雜湊是不是如攻擊者預期的一個字元一個字元改變，那如此即使有時間上的差異，也跟第幾個字元比對失敗沒有直接的關係。

## Request Signature

那到底有沒有其他例子是真的會需要注意這個漏洞的呢？我能想到的大概就是像是某些加密貨幣交易所，他們的 API 幾乎都需要做所謂的簽章。概念如下：交易所需要透過 API key/secret 確保這個請求是來自合法的使用者，所以每個請求都必須附帶上簽章，公式大概是這樣：

$$
Signature = HMAC(params, private\ key)
$$

這個的用意是使用者利用自己的私鑰去加密請求的參數，來證明自己是真的自己。
伺服器端則會用使用者本次請求的參數加上使用者的私鑰來去重組 Signature，假設 Signature 跟請求端附帶的一樣，那就是合法的請求。
在駭客的角度，由於沒有使用者的私鑰所以沒有辦法用正規途徑得到 Signature，但是利用 Timing Attack 這招就可以猜出本次請求所對應的 Signature 從而達到偽造身份的效果。但這有幾個不實際的地方：
1. 利用 Timing Attack 需要大量的嘗試，但通常伺服器端會有 rate limit，根本沒辦法在合理的時間猜到答案。
2. 再者，這種 Signature 加密機制都會再帶一個所謂的 nonce<sup>[4]</sup>，所以其實實務上也很難有辦法利用 Timing Attack。



講白了這個攻擊手段我個人覺得看起來很厲害但其實沒這麼可怕。除非是菜鳥工程師，不然實務上不太可能做出會被這個攻擊手段影響的系統...



# Reference
1. Return early and clearly [https://arne-mertz.de/2016/12/early-return/](https://arne-mertz.de/2016/12/early-return/)
2. 這個例子其實是所謂的 Order of evaluation, 跟 Early return 有一點不同。[https://en.cppreference.com/w/cpp/language/eval_order](https://en.cppreference.com/w/cpp/language/eval_order)
3. [Adding Salt to Hashing: A Better Way to Store Passwords](https://auth0.com/blog/adding-salt-to-hashing-a-better-way-to-store-passwords/)
4. [nonce](https://en.wikipedia.org/wiki/Cryptographic_nonce) 可以有效避免重送攻擊。 (重送攻擊我常常用，可參考我的另一篇文章 [從奧客玩家視角看遊戲防禦性設計](/2019/10/02/game-design-from-perspective-of-hacker/))
5. 另外補充一篇也是在介紹 Timing Attack 的文 [Using Node.js Event Loop for Timing Attacks](https://snyk.io/blog/node-js-timing-attack-ccc-ctf/)
{% ref_style %}
