---
title: Ways to Access Internal Network
date: 2019-08-12 03:02:06
tags:
- unix
- note
---

一般的公司或者實驗室都會隔離內部資源，只留一個統一的對外出口來達到比較高的安全性以及讓系統管理者較好控管。但是較高的安全性總是會帶來不便，這種隔離內部資源的架構導致我們無法直接存取內部資源，要透過一些拐彎抹角的方式來存取。

<!-- more -->

從以前當網管到現在工作一陣子之後，因為常常在家工作(加班?)，也累積了不少存取內部資源的方式，本篇就是紀錄一下這些方式，以免我這個金魚腦以後又忘記....

# VPN

使用 VPN 來存取 LAN 資源我想是最簡單直覺的了，前提是公司或實驗室有提供 VPN server 嘿。
阿假設你是系統管理者且你們想提供 VPN 服務，我會推薦使用 OpenVPN server，簡單易用。然後我之前有看到一個大神寫了個一鍵架設 VPN server 的 [script](https://github.com/Nyr/openvpn-install)
這個 script 從安裝，新增/刪除使用者， 應有盡有，堪稱無敵(?)

OpenVPN client 端設定很簡單，只要匯入預先產生的金鑰 (`.ovpn`) 至 client 端應用程式即可。
OpenVPN client 端應用程式也是十分完備，無論 Windows/Mac/Android/iOS 全都有！真的可以做到隨時隨地，手機拿起來就可以工作...?

# SSH

如果有時候你只是需要存取某台內部 server，只需要 terminal 環境，那其實直接使用 ssh 登入即可。如同引言所說，「通常一般的公司或者實驗室都會隔離內部資源，只留一個統一的對外出口」，那其實可以透過那台對望出口當作跳板，使用兩次 ssh 來做到登入你想要用的機器。

```sh
ssh -i ssh_key_path -p port username@office.domain.com
ssh username@my_computer
```

另外可以設定 ssh_config 來省去每次都要打一長串的指令，設定像這樣：

```
Host office
    User username
    HostName office.domain.com
    Port 56789
    IdentityFile ssh_key_path
 
Host my_computer_in_lan
    User username
    HostName 192.168.0.xx
    ProxyJump  office
    # If is Windows: use ProxyCommand:
    #     ssh.exe office -W %h:%p
```

這樣就只需要輸入 `ssh my_computer_in_lan` 即可。

然後給個小建議，系統管理者在設定對外 ssh 服務時，盡量設定成只允許 ssh-key 登入，並且把 ssh port 改成別的 (不要用預設 22)。網路世界很可怕 der~~ 用預設設定就不要抱怨天天被掃 port 或被暴力破解密碼 (想當初實驗室某伺服器 root 帳號被暴力破解，最後只好重灌QQ)。

# SSH tunnel + browser proxy

那假設你們的網管不願意提供 VPN 服務，你又想存取內部網頁之類的服務，匹如說內部自架的 GitLab，怎辦？
沒關係還是有招，這招叫做使用 ssh tunnel + browser proxy。聽起來很複雜？其實還好啦，這方法分為兩部分：

## 打通 ssh tunnel

ssh 其實是一個很強大的工具，藉由他其實可以做到打開一個通道，從你的電腦連通道組織的單一的對外出口，變成說只要透過這個 tunnel ，就等同連結到公司的那台對外的電腦上。指令如下：

```sh
ssh -i ssh_key_path \  # As usual, use ssh key to access is better
    -p 56789 \         # Your ssh server port
    -vvv \             # robust logging
    -NfD 12345 \       # N: do nothing, f: in background, D: create socket5 proxy
    username@office.domain.com
```

這神奇指令幫你打通一個 socket5 的通道，然後再設定瀏覽器去使用這個 proxy，就可以達成跟 vpn 一樣的效果！

## 設定瀏覽器

我這邊列出在 Mac 跟 Windows 上設定 proxy 的方式，但我想其他瀏覽器一定也有對應的方式設定。

- Mac: `open -a "Google Chrome" --args --proxy-server="socks5://localhost:12345"`
- Windows: 在 chrome 上案右鍵 > 內容 > 目標: `"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --proxy-server="socks5://localhost:12345"`

# Use VSCode to access remote project

有時候其實只是想用遠端電腦寫程式，用 ssh 當然也可，只是就是限制只能用 vim 之類的編輯器。
VSCode 最近推出了實用的 remote-ssh 功能，讓在家也可以使用遠端電腦開發。

可參考 ssh 那段來設定好 ssh_config，其他就如同平常使用 vscode 一樣，十分方便。

----------

雜談:

- 最近很多想寫想留個紀錄的東西，但總是有點沒時間寫 (或懶?)
- 本站最近突破四萬瀏覽囉～！恭喜四萬人浪費了五分鐘 (平均網頁停留時間)
