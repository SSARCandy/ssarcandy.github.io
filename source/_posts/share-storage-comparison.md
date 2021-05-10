---
title: Share Storage Comparison
date: 2021-05-10 15:36:52
tags:
- cloud
- unix
---


Share storage，諸如家用 NAS 或工作站常有的網路硬碟(NFS)，是一個很方便又隨處可見的一種存儲空間，方便的點在於可以從不同機器存取或修改同樣的資料、避免需要維護重複的東西在不同的機器上；常見的使用情境像是會將 `/home` 加目錄放置於 Share storage 中，然後再掛載至所有工作站的機器上，這樣就可以讓使用者無論是登入哪一台工作站機器，都可以保持同樣的家目錄環境，十分方便。

<!-- more -->

<link rel="stylesheet" href="https://unpkg.com/charts.css/dist/charts.min.css">

除了前言提到的使用情境以外，其實常見的使用方式也有像是拿來做為平行運算寫入的位置，或者用於存放大量資料集(dataset)給需要的人方便讀取(像是之前 CML 就是這樣用)。而諸如此類的應用其實就很考驗 Share storage 的讀寫性能，若性能不佳可能常常會壞掉，導致所有有掛載的機器都會陷入無法存取的窘境。

而本篇目的就是想要測測看市面上常見的 share storage 解決方案以及他們各自的寫入性能，做個大PK。底下列舉的就是我打算要測試的幾種 share storage (由於純讀取通常效能都很好，所以這邊只測寫入效能)

- Gluster file system v7 using SSD
- Ceph file system v13.2 using SSD
- Google Filestore (2T Premium Tier)
- IBM File Storage (6T Type Endurance)
- AWS EFS

其中前兩個(Gluster, Ceph)需要自建，後三個(GCP, AWS, IBM)則是直接用雲端解決方案。

測試的方式我就用原始又有效的 `dd` 指令來試啦，基本上腳本長這樣：

```bash
#!/bin/bash
f=`hostname`
rand=`head /dev/urandom | tr -dc A-Z | head -c 5 ; echo ''`
sync && dd if=/dev/zero of=/mnt/testfile_${f}_${rand} bs=10M count=100 oflag=direct 2>&1 | cat
```

這腳本有幾個參數可以調整：

- `bs` - block size 指單一寫入區塊的大小
- `count` - 寫幾個區塊
- `of` - 寫到哪裡，`/mnt/` 就是我們要測試的 share storage 的目錄

bs*count 就是總寫入大小，我這邊就統一使用 bs=10MB, count=100, 總計寫入 1GB。

而這個腳本執行的結果會像是這樣:

```bash
$ bash test.sh
100+0 records in
100+0 records out
1048576000 bytes (1.0 GB, 1000 MiB) copied, 4.59822 s, 128 MB/s 
#                                                      ^^^^^^^^
#                                                      這就是寫入速度
```

但這樣還不夠，要測試到極限的話，需要平行化同時執行一堆這個腳本，寫爆 share storage！


<div id="mychart">
  <ul class="charts-css legend legend-square">
    <li>Gluster</li>
    <li>Ceph</li>
    <li>GCP</li>
    <li>IBM</li>
    <li>AWS</li>
  </ul>
  <table class="charts-css column multiple show-labels show-4-secondary-axes data-spacing-10 datasets-spacing-1">
    <tbody>
      <tr>
        <th scope="row">100x10MB, 10 jobs</th>
        <td style="--size: calc( 43.6 / 90 );"><span class="data">43</span></td>
        <td style="--size: calc( 12.1 / 90 );"><span class="data">12</span></td>
        <td style="--size: calc( 67.2 / 90 );"><span class="data">67</span></td>
        <td style="--size: calc( 76.5 / 90 );"><span class="data">76</span></td>
        <td style="--size: calc( 13.6 / 90 );"><span class="data">13</span></td>
      </tr>
      <tr>
        <th scope="row">100x10MB, 20 jobs</th>
        <td style="--size: calc( 12.0 / 90 );"><span class="data">12</span></td>
        <td style="--size: calc( 6.2 / 90 );"><span class="data">6</span></td>
        <td style="--size: calc( 29.3 / 90 );"><span class="data">29</span></td>
        <td style="--size: calc( 66.1 / 90 );"><span class="data">66</span></td>
        <td style="--size: calc( 6.1 / 90 );"><span class="data">6</span></td>
      </tr>
      <tr>
        <th scope="row">100x10MB, 40 jobs</th>
        <td style="--size: calc( 9.0 / 90 );"><span class="data"> 9 </span></td>
        <td style="--size: calc( 6.0 / 90 );"><span class="data"> 6 </span></td>
        <td style="--size: calc( 21.1 / 90 );"><span class="data">21</span></td>
        <td style="--size: calc( 33.9 / 90 );"><span class="data">33</span></td>
        <td style="--size: calc( 2.8 / 90 );"><span class="data"> 2 </span></td>
      </tr>
    </tbody>
  </table>
</div>

<br>

|                   | Gluster   | Ceph     | GCP     | IBM       | AWS |
|-------------------|-----------|----------|---------|-----------|-----|
| 100x10MB, 10 jobs | 43.6      | 12.1     | 67.2    | 76.5      | 13.6|
| 100x10MB, 20 jobs | 12.0      | 6.2      | 29.3    | 66.1      | 6.1 |
| 100x10MB, 40 jobs | 9.0       | 6.0      | 21.1    | 33.9      | 2.8 |

▲ 不同 storage 寫入效能比較<sup>[1][2]</sup>


結果如上圖所示，自建的系統其實表現都遜於雲端方案(尤其是同時平行寫入很多時)，這不排除是因為我安裝 Gluster / Ceph 時基本上都是用預設的設定，沒有特別研究怎樣最佳化😱；而 AWS EFS 表現奇差，這有原因，底下詳述...。除此之外又穩又快的就是 GCP Filestore 以及 IBM File Storage 了，其中 IBM File Storage 在同時平行寫入很多時表現比較穩定，所以在這邊是 IBM 表現最佳🏆。

**AWS EFS**

AWS 的 EFS 的讀寫流量是有做限制的，基本上就是如果存越多資料在 EFS 裡面，則讀寫流量越高 (bursting mode)，這也造成基礎流量超低，如果用的儲存空間只有 100G，則讀寫流量大概落在 5 MB/s，每增加 100GB 的空間用量會增加 5 MB/s 的速度<sup>[3]</sup>，是個很妙的設計。在我這次的測試中，由於 EFS 基本上是空的，所以讀寫效能自然低下。


---

[1] 單位為 MB/s
[2] jobs 意指同時執行幾個寫入腳本，故若同時執行 10jobs，平均寫入可有 20MBps，則瞬時寫入速度為 200 MBps
[3] [AWS EFS - Scale and performance](https://aws.amazon.com/efs/faq/?nc1=h_ls)

<style>
table {
  font-size: 14px;
}
#mychart {
  margin-bottom: 30px;
}
#mychart .data {
  position: relative;
  top: -20px;
}
#mychart tr {
  height: 250px;
  margin: 0 auto;
}
#mychart .legend {
  flex-direction: row;
  justify-content: space-between;
  border: initial;
}
.charts-css.column.show-labels {
  --labels-size: 3rem;
}
</style>