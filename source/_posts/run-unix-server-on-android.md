---
title: Run Unix-like Server on Android
date: 2023-04-09 17:56:43
tags:
- unix
- trashtalk
- note
---

{% zoom /img/2023-04-09/01.png 隨便一台手機的性能都比低階的雲端虛擬機來的強大不少。%}

<!-- more -->

最近正好汰換下來一台 Pixel 4a，正在想辦法將他的剩餘價值發揮到最大化。前篇 {% post_link make-old-pixel-as-photo-uploader 把舊的 Pixel 改造成無限照片上傳機 %} 已經發揮了一些價值，但是不夠！這次我要用這個手機來取代掉我長久以來租的雲端虛擬機，把月租費省下來。

# 選擇安裝方法

要用手機來取代雲端虛擬機器，其實還是有一些困難，首先家裡並沒有固定 IP，也就是說用手機來當作伺服器的話沒辦法在外面存取，如果有架設網站的需求的話那這肯定是行不通。
不過我的情況剛好不需要固定 IP，我要的其實是一個開發機兼永不停機的伺服器讓我可以在上面跑一些定時的工作或者是跑一些需要長時間運作的程式。

那接下來就是要來思考我需要什麼，主流在安卓設備上面跑 unix Server 有兩種方式，一種是使用 Termux<sup>[1]</sup>，另一種是直接安裝完整的系統在手機上<sup>[2]</sup>。
Termux 的好處是安裝十分容易也不需要 root，壞處是他雖然是 unix-like 的系統，但是算是閹割版，可能有少數一些指令或者 package 是沒辦法使用的；反之，直接安裝完整的系統那當然可以獲得最像是 Ubuntu 的體驗，但相對來講比較難裝較複雜，可能也免不了需要取得 root。

考量到基本上我只需要有可以開發及部屬 Python, node.js, C++ 的應用程式，所以我選擇使用 Termux 就好了。

# 我的需求

我的需求可以簡單列出：
- 可以透過 ssh 存取
- 有 Python, node.js, C++ 開發環境
- 可以用 vscode 開發

Termux 真的十分強大，大部分的指令都跟在使用 Ubuntu 一樣簡單，但我還是遇到了一些坑，特此紀錄一下。

## ssh

Termux 安裝好後，還需要安裝 openssh 等東西才能使我可以從外部 ssh 進去。

```bash
$ pkg install openssh
$ vim ${PREFIX}/etc/ssh/sshd_config
# PasswordAuthentication yes
$ sshd
```

`sshd` 也可以用 `screen` 等等的指令執行背景，就不會占用前景。
另外也可以用 ssh key 的方式登入，就不需要每次打密碼。
而 `$PREFIX` 是 Termux 的根目錄，一般常見的 `/usr`, `/etc` 等等路徑在 Termux 底下就會被對應至 `$PREFIX/usr`, `$PREFIX/etc`

## Dev Environments

```bash
# python
$ pkg install python3

# node.js
$ pkg install nodejs-lts

# C++
$ pkg install glib cmake gdb
```

三行指令就安裝完絕大部分需要的工具。
另外開發 C++ 時經常需要 libboost，很可惜沒有辦法直接透過 `pkg install` ，但可以用原始碼編譯：

```bash
$ wget https://boostorg.jfrog.io/artifactory/main/release/1.81.0/source/boost_1_81_0.tar.gz
$ tar xvf boost_1_81_0.tar.gz
$ cd boost_1_81_0
$ ./bootstrap.sh --prefix=$PREFIX
$ ./b2

# Copy header & library to right place
$ cp -a boost /data/data/com.termux/files/usr/include
$ cp -a stage/lib/* /data/data/com.termux/files/usr/lib/
```

安裝完後就可以用 cmake 找到 libboost.

## vscode

vscode 就相當多坑了...首先，vscode 無法透過 Remote-SSH 套件連線到 Termux，因為缺少必要的一些東西 (libstdc++, glibc 是閹割版)<sup>[3][4]</sup>。所以可以改安裝 code-server。
code-server 是一個 Web 版的 vscode，從介面到使用方式都與原生 vscode 十分相似，所以用這個也是完全可以接受的解決方式。

但要安裝 code-server 十分之困難，我後來找的一個[全是韓文的影片](https://www.youtube.com/watch?v=-Je02KP3268)才順利安裝成功：

```bash
$ pkg install nodejs-lts python yarn binutils
$ v=$(node -v); v=${v#v}; v=${v%%.*};
$ FORCE_NODE_VERSION="$v" yarn global add code-server@4.6.0 --ignore-engines;

# after installation done, launch it in screen
$ screen -S code-server
$ code-server --bind-addr 0.0.0.0:8080 --disable-telemetry
```

然後就可以打開瀏覽器 `PRIVATE_IP:8080` 即可看見熟悉的 vscode 畫面。

但是事情沒有這麼簡單...這 vscode 壞掉的地方可不少，他 built-in Terminal 打不開，搜尋功能無法使用，Source Control 裝死....
經過一系列研究及嘗試後<sup>[5]</sup>，終於把全部都解決了...

```bash
### bulit-in Terminal cannot open
# [IPC Library: Pty Host] Unknown channel: ptyHost
# rejected promise not handled within 1 second: Unknown channel: Channel name 'ptyHost' timed out after 1000ms
$ sed -i -e 's|switch(process.platform)|switch("linux")|' /data/data/com.termux/files/home/.config/yarn/global/node_modules/code-server/lib/vscode/out/vs/platform/terminal/node/ptyHostMain.js

### Search not working
# ...@vscode/ripgrep/bin/rg': No such file or directory
$ pkg install ripgrep
$ cp /data/data/com.termux/files/usr/bin/rg .config/yarn/global/node_modules/code-server/lib/vscode/node_modules/@vscode/ripgrep/bin/rg.config/yarn/global/node_modules/code-server/lib/vscode/node_modules/@vscode/ripgrep/bin/rg

### Source Control not working
# The folder currently open doesn't have a git repository
$ pkg install git
$ vim ~/.local/share/code-server/Machine/settings.json
{
    "git.path": "/data/data/com.termux/files/usr/bin/git"
}
```

這些改完以後，記得重啟 code-server。

# 其他有用的訣竅

## Monitor CPU Loading
htop 在 non-root Termux 是半殘的，看不到 CPU loading，這是由於 Android 系統級別的設定，讓一般應用程式 (Termux 也算應用程式) 無法存取到 `/proc`。
所以可以改安裝 `pkg install neofetch`，他可以正確展示 CPU 使用量 (如本文首圖)，不知怎辦到的 哈哈。

## Turn off System Task killer
在安裝好所有東西以後，隔天我就發現無法 ssh 到手機上了，一看才發現被系統殺掉了。現在比較新版本的 Android OS (12+) 都有嚴格的執行緒限制，應該是 32 左右，這數字太小了會導致 Termux 經常被殺掉。
所以需要透過 adb 去把這個東西關掉<sup>[6]</sup>：

```bash
# For Android 12L & Android 13:
./adb shell "settings put global settings_enable_monitor_phantom_procs false"

# For Android 12：
./adb shell "/system/bin/device_config set_sync_disabled_for_tests persistent; /system/bin/device_config put activity_manager max_phantom_processes 2147483647"
```

## Adjust Time
Server 通常都要是 UTC 時間會比較方便，結果這其實不需要在 Termux 內用指令調整，只需要去手機 設定>時間>選擇時區 即可。

## Bind mac address to private IP
由於手機是透過 WiFi 連上家用網路，private IP 是透過 DHCP 分配，但如果 IP 經常改變很不方便。
可以通過家用 router 去設定 mac address 綁定分配的 private IP 來避免 IP 跑掉。
(ASUS router 有這功能<sup>[7]</sup>，不確定其他廠牌有沒有)

# 效能


# Reference

[1] [Termux Wiki](https://wiki.termux.com/wiki/Main_Page)
[2] [連筆電都懶得帶? 那就在 Android 上跑 VS Code 吧! | Termux , PRoot , VS Code Server](https://home.gamer.com.tw/artwork.php?sn=5533738)
[3] [Remote host prerequisites](https://code.visualstudio.com/docs/remote/linux#_remote-host-container-wsl-linux-prerequisites)
[4] [SSH to Termux not working.](https://github.com/microsoft/vscode-remote-release/issues/3769)
[5] [[Bug]: Terminal is not working on Termux.](https://github.com/coder/code-server/issues/5496)
[6] [Fix [Process completed (signal 9) - press Enter] for Termux on Android 12+ devices](https://ivonblog.com/en-us/posts/fix-termux-signal9-error/)
[7] [[Wireless Router] How to manually assign IP around the DHCP list?](https://www.asus.com/support/FAQ/1000906/)
