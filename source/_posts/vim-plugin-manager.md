---
title: 談談 vim plugin-manager
date: 2016-08-17 11:02:10
tags: vim
---

我用過了幾乎所有有名的 vim plugin-manager，包含 [Pathogen](https://github.com/tpope/vim-pathogen), [Vundle](https://github.com/VundleVim/Vundle.vim) 以及比較新的 [vim-plug](https://github.com/junegunn/vim-plug)。
而以時間序來說也是 Pathogen -> Vundle -> vim-plug

先來談談用過這三個分別的感想好了：

<!-- more -->
#### Pathogen
簡單好用，與其說是 plugin-manager，個人覺得比較像是個純粹的 run-time loader，沒有什麼其他的功能。
但已十分好用，要新增什麼 plugin，只需把 plugin 的資料夾放在 `bundle/` 底下就完工了！
刪除也是，直接砍掉 `bundle/` 底下對應資料夾就OK

#### Vundle
目前應該是這三者中 github stars 最多的。
plugin 安裝方式是在 `.vimrc` 中寫你要的 plugin name

```vim
Plugin 'tpope/vim-fugitive'
```
然後在 vim 中打 `:PluginInstall` 就會幫你安裝。

這樣的好處是你裝過什麼一目了然，而且到新環境要重新設置的時候也很方便，直接`:PluginInstall`就完成了。(如果用 Pathogen 就必須自己把要用的 plugins clone 下來。)

#### vim-plug
我目前在使用的 plugin-manager ，給我的感覺就是 Vundle 的加強版。
新增 plugin 的方式跟 Vundle 很像(只是關鍵字不同)，都是在 `.vimrc` 中寫你要的 plugin name

```vim
Plug 'tpope/vim-fugitive'
```
安裝也是跟 Vundle 差不多，關鍵字不一樣而已 (`:PlugInstall`)

比較厲害的是 vim-plug 可以 **on-demand loading**！
像是 [vim-go](https://github.com/fatih/vim-go)(強大的 Golang Dev-plugin)，這種只有在寫 golang 時候才要的 plugin，就應該只在副檔名是`.go`的時候載入就好；
[NERDTree](https://github.com/scrooloose/nerdtree) 也是，有時候只是打開一個檔案要編輯而已，用不著這個套件，只有當真的觸發開啟 NERDTree 的時候再載入就好。
這些 vim-plug 都可以設定(設定方式詳見 [readme](https://github.com/junegunn/vim-plug))，大幅提升 vim 開啟速度～

### 效能
我從 Pathogen 換到 Vundle 是為了可以很容易的在新環境設定好 vim，
而從 Vundle 換到 vim-plug 則是為了他的 on-demand loading。

所以說到底效能差多少？
其實我並不是個重度 plugins 使用者，有在用的 plugins 大概 20 個吧。
所以從 Vundle 換到 vim-plug 說實在並沒有顯著效能差異。
不過還是可以看看別人的實驗
{% zoom /img/2016-08-17/1.png 不同 plugin-manager 的開啟速度(plug = vim-plug)。圖片出自 vim-plugins-and-startup-time %}
 
不難發現，有 on-demand loading 的 plugin-manager 開啟速度會快不少，以圖中為例大概都可以快上個 30% ！
如果有興趣，也可以自己試試 vim 的開啟速度，可以用以下的方法測量。

```bash
$ vim --startuptime vim.log
```

詳細開啟資訊都會寫入 `vim.log`

---

References:
[1] [vim-plugins-and-startup-time](http://junegunn.kr/2014/07/vim-plugins-and-startup-time/)
[2] [vim.tw](https://www.facebook.com/groups/vim.tw/)
