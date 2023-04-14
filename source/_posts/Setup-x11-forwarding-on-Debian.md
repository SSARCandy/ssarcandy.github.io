---
title: Setup x11 forwarding on Debian
date: 2017-03-20 02:03:08
tags:
- unix
- note
image: /img/2017-03-20/01.PNG
---


有時候會需要在 server 上使用有 GUI 介面的程式，像是我們會把 matlab 安裝在運算能力很好的工作站上供大家使用。但透過 ssh 連上工作站的話介面會是 terminal，使用上就會比較不便。

Linux 的 GUI 運作模式，其中

- X-client 負責程式的運作
- X-server 負責畫面的顯示

所以只要把工作站上的圖形顯示丟到本地端(windows/mac)的 X-server，就可以顯示出來了。
本篇將介紹如何設定才能使 Debian Server 的 GUI 程式的畫面顯示到 client 的電腦上。

<!-- more -->


# Debian Server


## 安裝 X-server

如果 server 一開始就是灌沒有桌面環境的，現在就要安裝一下:

```sh
    $ apt-get install xserver-xorg-core
```

也可以裝個 gvim 來測試。

```sh
    $ apt-get install vim-gtk
```

## 啟用 `X11Forwarding` 

server 這邊，必須要允許 ssh 的連線 forward 這些圖形介面的資訊到 client 端，所以需要去 `/etc/ssh/ssh_config` 中設定:

```sh
    $ vim /etc/ssh/ssh_config
     
    # add this line:
    X11Forwarding yes
```

設定好記的重啟 sshd 服務:

```sh
    $ service sshd reload
```

# Client Setup

本機端也是要有相應的設定才能正確地接收 server forward 過來的圖形介面，Mac 十分容易，而Windows 的設定比較麻煩。


## Mac

打開你的 terminal，用 ssh 連線至主機:

```sh
    $ ssh -X user@example.com
     
    # on remote server
    $ gvim # open vim GUI version for testing
```

不過最近 Mac 已不再內建 X11<sup>[1]</sup>，
所以如果你系統版本高於 Sierra，則必須下載 [XQuartz](https://www.xquartz.org/)。


## Windows

在 windows 上需要安裝 X-server 才能使用 x11 forwarding，我推薦使用 Xming。
下載並安裝好以後，確認通知列有出現 Xming 的圖示。

並且要再更改 server 上的 `ssh_config` :

```sh
    $ vim /etc/ssh/ssh_config
     
    # add these two lines
    X11DisplayOffset 10
    X11UseLocalhost yes
```

記得重啟 `sshd` service

接下來使用 PuTTy 來連線:

1. Session > Host Name: 輸入 server ip
2. Connection > SSH > X11:
  - Enable X11 forwarding → 打勾
  - x display location: `localhost:0`


連上之後，可以試試輸入以下指令:

```
    $ echo $DISPLAY
    localhost:10.0
```

如果看到如上的回傳，就表示一切正常。

試試 `gvim` ，就會跳出小巧可愛的視窗:

{% zoom /img/2017-03-20/01.PNG 透過 X11-forwarding 讓 server 上的 gvim 顯示到本機(windows) %}


# References

1. [Mac 已不再隨附 X11](https://support.apple.com/zh-tw/HT201341)
2. [SSH X11 Forwarding](http://cypresslin.web.fc2.com/Memo/M-SSH.html)
3. [Installing/Configuring PuTTy and Xming](http://www.geo.mtu.edu/geoschem/docs/putty_install.html)
4. [Setup X11 Forwarding over SSH on Debian Wheezy](https://www.vultr.com/docs/setup-x11-forwarding-over-ssh-on-debian-wheezy)

{% ref_style %}
