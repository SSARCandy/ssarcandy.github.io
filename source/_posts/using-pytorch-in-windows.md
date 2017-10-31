---
title: Using PyTorch in Windows 10
date: 2017-09-27 22:17:32
tags:
- unix
- python
- pytorch
- note
---

最近開始在使用 PyTorch 寫些東東，他支援 MacOS/Linux 使用，唯獨 Windows 不支援…
所以我一直都是使用 Mac 寫相關的東西。

但是我的桌機都是 Windows，在可以用桌機的環境下卻必須使用小小的 Mac 打字真的不是很高興…
正好最近從學長那邊得知有個方法可以讓 Windows 使用 PyTorch ，就趕緊來試試！

<!-- more -->

Window 10 現在有個東西叫 Windows Subsystem for Linux (WSL) ，是一個在 Windows 下的 Ubuntu 子系統，這個子系統可以做到任何正常 Ubuntu 做得到的事。
那我就可以在 WSL 中按照 Linux 的流程設定好 PyTorch 的相關環境，然後在 Windows 中使用 WSL 的 Python 環境，就可以達到目的 (讓 Windows 使用 PyTorch)。

所以基本上環境設置步驟：

1. 啟用 Windows Subsystem for Linux 。
2. 弄好 WSL 中的環境，包含 Python 以及 ssh server 的設定。
3. 讓 Windows 使用遠端 (WSL) 的 Python 環境。

# Install Windows Subsystem for Linux

1. 開啟**開發人員模式**
2. 用系統管理員開啟 cmd，輸入 `OptionalFeatures` 指令，會跳出一個視窗

{% zoom /img/2017-09-27/01.png  勾選「適用於 Linux 的 Windows 子系統」 %}

完成以後可能需要重開機。

# Install PyTorch in WSL

接下來是要在 WSL 中設置 Python 以及 PyTorch 的相關環境。
如果沒有 Python 記得先安裝。

然後安裝 PyTorch，基本上按照 [PyTorch 官方網站](http://pytorch.org) 教學操作：

```bash
$ pip install http://download.pytorch.org/whl/cu75/torch-0.2.0.post3-cp27-cp27mu-manylinux1_x86_64.whl
$ pip install torchvision
```

# Install Python IDE (PyCharm)

PyCharm 是一個可以寫 Python 的 IDE，雖然專業版要錢，不過學生免費～YA！

安裝就不贅述了，反正就是一直下一步…

## 設定使用遠端 Python

由於要用 WSL 裡面的 python，所以必須設定 Remote Python Interpreter

1. Project setting > Project interpreter
2. Add Remote
3. 填入 ssh 資訊

{% zoom /img/2017-09-27/02.png  填一填 ssh 相關資訊。 %}

由於是要透過 ssh 去存取 WSL 中的 Python ，所以 WSL 那邊要開啟 ssh service 好讓 PyCharm 連線。

在 WSL 中:

```bash
$ sudo service ssh start
  * Starting OpenBSD Secure Shell server sshd [ OK ]
```

## 設定 Path mappings

WSL 其實是可以存取本機 (Windows) 的資料的，預設 C 槽是掛載在 `/mnt/c`
這也要設定一下才能讓 PyCharm 運作正常：

1. Project setting > Project interpreter
2. 新增 mapping `C: → /mnt/c`

{% zoom /img/2017-09-27/03.png 設定 Path mapping 的地方也是在 Project setting > Project interpreter %}

# Misc

## 開啟 ssh service 時噴錯

```bash
$ sudo service ssh start
initctl: Unable to connect to Upstart
Bind to port 22 on 0.0.0.0 failed: Address already in use.
```

去更改 `/etc/ssh/sshd_config` :

```bash
PasswordAuthentication yes
UsePrivilegeSeparation no
Port <random number>
```

基本上最重要的就是換個 Port 了，會沒辦法啟動大概是本機 (Windows) 有程式已經占用 Port 22 了。

## 不能安裝 PyTorch

```bash
$ pip install torch-xxx.whl
torch-xxx.whl is not a supported wheel on this platform.
```

請檢察 `pip -V` 版本，起碼要是 9.0 以上，可以用以下方法更新 `pip`:

```bash
$ pip install --upgrade pip
```

# References

[1] [Windows Subsystem for Linux (WSL) 安裝教學 & 初體驗](https://blog.birkhoff.me/bash_on_windows_installation/)
[2] [Configuring Remote Interpreters via WSL](https://www.jetbrains.com/help/pycharm/configuring-remote-interpreters-via-wsl.html)