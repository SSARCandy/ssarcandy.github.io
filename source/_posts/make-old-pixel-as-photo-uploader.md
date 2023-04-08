---
title: 把舊的 Pixel 改造成無限照片上傳機
date: 2023-04-08 15:48:18
tags:
- trashtalk
---

自從 Google Photos 養套殺，取消高畫質無限上傳以後<sup>[1]</sup>，對於我這種習慣使用 Google Photos 的人無疑是重大悲劇，空間用完指日可待。目前 Google Photos 的高畫質無限免費上傳是專門給 Pixel 2~5 的優待，只要是由這些型號的裝置上傳的照片，就可以享有這項福利，並不限制照片需使用這些裝置拍攝所得。為了蹭 Pixel 舊裝置可以以“高畫質”無限免費上傳 Google Photos，即使換了新手機，也應該想辦法由舊裝置來上傳相片。

<!-- more -->

這邊所謂 **”高畫質”** (Storage Saver) 其實是有壓縮的，目前只有 Pixel 1 可以免費 **”原始畫質”** (Original) 上傳，但對我而言有免費高畫質就很好了，直接省下訂閱 Google One 的費用。

如何達成這個任務呢？基本上的流程會是以下三個步驟：

1. 新手機拍攝照片
2. 新手機將照片同步至舊手機
3. 舊手機自動備份至 Google Photos

但在這裡，需要注意的是，新手機不要開啟 Google Photos 備份功能，以免佔用雲端空間。

接下來，我們需要尋找一個雲端相片同步服務來當作中繼站，讓新手機拍攝的照片同步至舊手機的暫存空間，以利後續的備份。
在我的實作中，我選擇了 Mega 和 [MegaSync](https://play.google.com/store/apps/details?id=com.ttxapps.megasync)。

{% zoom /img/2023-04-08/01.png 流程圖。 %}

上面流程圖簡單的展示了整個流程，接下來就是把需要的東西準備好：

- Pixel 5 or an earlier device
- Google Photos 需安裝於新、舊手機
- Mega 需安裝於新、舊手機
- [MegaSync](https://play.google.com/store/apps/details?id=com.ttxapps.megasync) 需安裝於舊手機

Mega 是一個雲端儲存服務，提供免費的 50GB 儲存空間，註冊且下載至新手機以後以後，只要開啟 Camera Upload <sup>[2]</sup> 功能即可。空間方面也不用擔心耗盡，一方面是他有 50 GB，另一方面是我只是要將它當作一個暫存中繼站，只要後續備份完成，這邊的照片即可清空。

而 [MegaSync](https://play.google.com/store/apps/details?id=com.ttxapps.megasync) 是一個第三方 app，功能類似於 `rsync` ，可以將 Mega 上面的指定資料夾下的檔案同步至手機地端，所以只要設定好要同步 Camera Upload 資料夾，就可以利用這個機制去下載我新手機所拍攝的照片到舊手機上。

至此，新手機拍攝的相片已經同步至舊手機，這時候只需要在舊手機的 Google Photos 開啟 **“高畫質”** 備份選項，一切就大功告成。

另外為了維持整個流程穩定，最好要把

- 舊手機上將 [MegaSync](https://play.google.com/store/apps/details?id=com.ttxapps.megasync) 的電池最佳化關閉，
- 新手機上將 Mega 的電池最佳化關閉

才不會導致被系統限制無法在背景執行這些程式。

總結來說，透過這樣的改造，我們可以輕鬆地享有 Google Photos 的高畫質無限免費上傳功能，並且也能賦予舊裝置一個新的功能而非擺在抽屜閒置。只要按照以上的步驟進行操作，就可以輕鬆地完成一台無限照片上傳機的改造。

---

[1] [Google 相簿儲存空間政策更新](https://support.google.com/photos/answer/10100180?hl=zh-Hant)
[2] [How to use camera uploads?](https://help.mega.io/installs-apps/mobile/camera-uploads)