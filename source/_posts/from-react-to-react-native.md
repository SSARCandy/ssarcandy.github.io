---
title: From React to React Native
date: 2017-02-02 11:04:00
tags:
- react
- react native
---

接觸 React 其實也一段時間了，總是嚷嚷想做個自己的 Project 但始終沒有動手開始做。最近趁著寒假終於用 React 做了個[網頁小遊戲](https://ssarcandy.tw/colorblocks-react/)，之後也改寫成 React Native 做出 Android and iOS 的原生 app，順便把 android 版上架到 [Google play](https://play.google.com/store/apps/details?id=com.colorblocksrn) 上～(iOS app store 費用太高付不起…)
算是完成幾個長久以來的小小目標(?)


{% zoom /img/2017-02-02/01.jpg 用 React Native 做出 Android/iOS 原生 app %}


<!-- more -->

說真的寫好 React 版本以後要改寫成 React Native 還挺容易的，基本上要改的只有介面的部分，對應到程式碼大概就是每個 Component 中的 `render()`，當然還有 CSS 要改成 react-native 的 style，Animation 也不能用 CSS 來做了，這也是比較麻煩的地方。


# 檔案結構

React 版跟 React Native 版的檔案結構其實幾乎都是差不多的，可以看下圖的對應：

{% zoom /img/2017-02-02/02.png 左圖是 React 的檔案結構；右圖是 React Native 的檔案結構。 %}


最大的差異是 `style/` 資料夾不見了，這是因為 React Native 的 style 我都寫在 components 檔案裡面了。React 版本的 `index.js` 是進入點。其他檔案基本上都維持一樣的結構、React 版本定義的 components 在 react-native 版中都依舊存在。

{% zoom /img/2017-02-02/03.png 左為 React 版；右為 React Native 版，元件完全一致。 %}



# 改寫 `render()` 

> 邏輯可以重用，要改的只有渲染的部分。

我在改寫的時候，反正第一步就是把 `<div>` 通通改成 `<View>` ，把包住文字的 `<span>`、`<div>` 改成 `<Text>` ，這樣大概就完成一半了吧(?)
剩下的一半就是找找最適合的 native component ，這些可以上官方文件尋找。


# 改寫 Style

> 看似像 CSS，但又沒這麼好用，比較像是閹割版的 CSS。

React Native 的 style 是個 javascript 的物件，大概有七成可以跟 CSS 直接對應，寫法就是原本 CSS 改成 camlCase 寫，如果要寫得像 css 的 class 的話還要使用 `StyleSheet.create()` :

```js
// css
.name {
    font-size: 20px;
}
 
// react native
const styles = StyleSheet.create({
    name: {
        fontSize: 20
    }
});
```

套用樣式的寫法則是直接用 `style={Object}` ，若要套用複合樣式，則在 style 中放一個 object array(順序有差):

```html
    <View>
      <Text style={styles.red}>just red</Text>
      <Text style={[styles.red, styles.bigblue]}>red, then bigblue</Text>
    </View>
```

# Animation

原本 React 版的動畫全都是用 css 做出來的，但這些在 React Native 中就沒辦法用了，官方有提供 Animation 相關的 [API](https://facebook.github.io/react-native/docs/animations.html)，但說實在的真的有點難搞。
後來我是用某大神寫的 library [react-native-animatable](https://github.com/oblador/react-native-animatable)，比起官方提供的更好用。

# Divide and Conquer

> 改寫要一部份一部份改比較容易，一次要全改只會要你命！

從 React 改成 React Native 雖然好像不用費很大的功夫，但是如果想要一次到位全部改好其實還是很困難的。
我這個 Project 已經是很小規模的了(約 500 多行)，但第一次想一次到位時我花了一兩個小時還是連 build 都沒辦法成功。所以果然還是一部份一部份改起來比較輕鬆。
以我的例子而言，是先改 `<StatusPanel/>` ，因為只要會倒數就好嘛，單純了自然就比較好寫；再來改 `<ArrowKey/>` 最後才是改 `<QuestionList/>` 跟 `<Question/>` ，這樣分批改前前後後大概只花兩個小時就全部搞定了。


# 一些坑以及一些筆記


#### 進入點註冊程式就好

React Native 官方 example 的主程式都是寫在 `index.android.js` (或 `.ios.js` ) 裡面，個人感覺是可以把主邏輯拆出來，進入點只負責註冊程式就好:

```js
import { AppRegistry } from 'react-native';
import colorblocksRN from './src/app'; // 主程式 component
    
// 進入點只做 register 的動作
AppRegistry.registerComponent('colorblocksRN', () => colorblocksRN);
```


#### iOS 樣式有差

即使用一模一樣的 code，iOS 跑起來樣式跟 android 的還是有差別，這我也不知道為甚麼，反正最後記得針對 iOS 的樣式再修改修改。


#### 不能 `react-native run-ios`

假設遇到這問題，首先先檢查 port 8081 有沒有被佔用了:

```bash
    $ lsof -n -i4TCP:8081
    $ kill <pid>
```

如果問題沒排除，試試

```bash
    sudo react-native run-ios
```