---
title: 用 Travis CI 自動部屬 hexo 到 GitHub
date: 2016-07-29 00:51:43
tags:
- hexo
- CI
---

其實 [hexo](https://hexo.io/) 作者 TC 已經有發過[一篇文章](https://zespia.tw/blog/2015/01/21/continuous-deployment-to-github-with-travis/)在講這個主題了，也講得很清楚了，基本上~~矇著眼睛~~照做就行了。
而這篇主要是再補充幾個細節。

<!-- more -->

## SSH KEY
  矇著眼照做[那篇](https://zespia.tw/blog/2015/01/21/continuous-deployment-to-github-with-travis/)，到這行:
  ```
  $ travis encrypt-file ssh_key --add
  ```
  這邊會幫你上傳 ssh_key 到 Travis 上，`--add`這個flag可以幫你插入解密指令到`.travis.yml`的`before_install`。
  不過這flag真的很機車，會把你的`.travis.yml`排版全搞亂，順便把註解刪光光！
  建議不要加`--add`自己手動插入解密指令，排版就不會亂掉。
  另外，如果因某種天災人禍導致忘記或沒辦法用指令插入解密指令，還是可以上 Travis 上的設定中看到環境變數名稱。
  ![repository > more options 可以設定、看到 Travis 的環境變數](/img/2016-07-29/2.PNG) 

## USE SSH
  Travis 是用 GitHub 的 [Deploy key](https://developer.github.com/guides/managing-deploy-keys/) 來存取 repository 的，關於如何產生以及設定 Deploy key 都照著 TC [那篇文章](https://zespia.tw/blog/2015/01/21/continuous-deployment-to-github-with-travis/)做就可以了。
  如果不幸在`hexo deploy`時遇到錯誤如下:
  ```
  remote: Invalid username or password.
  fatal: Authentication failed for "...."
  ```
  
  那可以檢查一下 hexo 的`_config.yml` `deploy`的部分，要用 ssh 的形式設定 repository
  ```title: _config.yml
  deploy:
    type: git
    repo: git@github.com:SSARCandy/ssarcandy.github.io.git
    branch: master
  ```

## PROTECTED BRANCH
  Protected branches 是 GitHub 的一個貼心功能，防止被保護的 branch 被刪除或被強制更新(forced-update)。
  ![repository > setting > branches 可以設定 Protected branches](/img/2016-07-29/1.PNG) 
  我這個網站結構如下:
  
  > [develop] -> default branch，我在這條 branch 新增文章、修改樣式等等
  > [master]  -> 放 static-files，也就是 hexo generate 出來的東東
  
  讓 Travis 自動部屬時，Clone 的是 `develop` branch， 經過`hexo generate`後推到`master` branch 上，而這會是 forced-update。
  雖然這可能是因為我沒有拆成兩個repo吧?
  反正不要 protect `master` 就好了 XD
  缺點是`master`上就會一直 force-update...

----

附上我的 `.travis.yml`，基本上跟 TC 那篇 87% 像啦...
```title: .travis.yml
language: node_js
node_js:
  - "4"
 
before_install:
  # Decrypt the private key
  - openssl aes-256-cbc -K $encrypted_d7634ff77415_key -iv $encrypted_d7634ff77415_iv -in .travis/ssh_key.enc -out ~/.ssh/id_rsa -d
  # Set the permission of the key
  - chmod 600 ~/.ssh/id_rsa
  # Start SSH agent
  - eval $(ssh-agent)
  # Add the private key to the system
  - ssh-add ~/.ssh/id_rsa
  # Copy SSH config
  - cp .travis/ssh_config ~/.ssh/config
  # Set Git config
  - git config --global user.name "ssarcandy"
  - git config --global user.email ssarcandy@gmail.com
  # Install Hexo
  - npm install hexo -g
  # Clone the repository
  - git clone https://github.com/SSARCandy/ssarcandy.github.io .deploy
 
script:
  - hexo generate
  - hexo deploy
 
branches:
  only:
  - develop
```