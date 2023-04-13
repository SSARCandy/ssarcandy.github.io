---
title: Develop a Plugin for Hexo
date: 2020-02-09 13:42:04
tags:
- hexo
- javascript
- nodejs
---


這陣子心血來潮花了點時間整理敝部落格的原始碼，整理的過程發現其實可以把一些小工具獨立成模組，一方面可以讓 codebase 變精簡，另一方面則是抽出來的模組也可以給其他 Hexo 使用者使用。
一開始我以為只是搬移一下程式、剪剪貼貼就可以完成，後來越做越不對勁...原來要做一個 Hexo Plugin 也是滿多地方需要注意的。
最後的成品叫做 [hexo-tag-photozoom](https://github.com/SSARCandy/hexo-tag-photozoom)，有興趣歡迎用用看～

<!-- more -->

# History of this Feature

我這次要搬移的是我原本實作在 theme 裡面的功能，就是可以把內文圖片放大的功能，非常像 Medium 網站上按圖片會有的效果。效果如下：

{% zoom /img/2020-02-09/01.jpg  按圖片會有跟 Medium 網站一樣的效果 (小螢幕裝置沒有) %}

原本我是直接在 theme 中使用 @nishanths 的 [zoom.js](https://github.com/nishanths/zoom.js)，直接引用他的 sciprt，並自己註冊一個 Hexo tag：

```html title: layout.yml
<!-- in theme layout file include external resource -->
<script src="./js/zoom.js"></script>
<link rel="stylesheet" href="./css/zoom.css">
```

```js title: scripts/helper.js
/**	
 * {% zoom /path/to/image [/path/to/thumbnail] [title] %}	
 */	
hexo.extend.tag.register('zoom', (args) => {	
  const { thumbnail, original, title } = parse(args);
  return `
  <div>	
    <img src="${(thumbnail || original)}" alt="${title}" data-action="zoom" class="photozoom">	
  </div>`;
});
```

透過 `hexo.extend.tag.register` 可以註冊新的 tag 語法，可以直接在文章 markdown 中使用，這個 tag 本身把 `{% raw %}{% zoom %}{% endraw %}` 轉換成完整的 html 格式，並且由於已經在前端引用 `zoom.js` library，所以就可以正常運作。

# Move to Seperate Module

原本的作法是直接在 layout 中引用 `zoom.{js,css}` library，這當然可行，但當要把這功能模組化時，是沒辦法直接接觸 layout 的 (除非你要在 readme 裡面叫使用者自己引用...)，所以必須要有個方式把這些必要的外部資源塞進去使用者的 html 裡面。
關於這段「如何把外部資源塞到使用者的靜態檔中」，我參考了其他 plugin 的做法，發現大部份都是使用 `hexo.extend.generator` 來達成。不過我最後選擇其他做法來完成這件事。

## Use Hexo Generator

Hexo 在編譯資源時，提供多種方式註冊自己的程式，來達到高度客製化。
其中 `Generator` 是用來產生檔案對應的路由，所以 `Generator` 都是回傳 `{ path: 'foo', data: 'foo' }` 的格式，代表著 path 對應的 data 是什麼。
透過 `Generator` 可以做到 copy file 的功能，官方網站也有提供[範例](https://hexo.io/api/generator.html#Copy-Files)，再搭配註冊 tag ，就可以達成動態插入必要的外部資源。

```js
// generator that create a virtual path to external file
hexo.extend.generator.register('asset', function(locals){
  return [{
    path: 'zoom/zoom.js',
    data: () => fs.createReadStream('/path/to/zoom.js'),
  }, {
    path: 'zoom/zoom.css',
    data: () => fs.createReadStream('/path/to/zoom.css'),
  }];
});
  
// register tag that include generator's path
hexo.extend.tag.register('zoom', (args) => {	
  const { thumbnail, original, title } = parse(args);
  return `
  <script src="/zoom/zoom.js"></script>
  <link rel="stylesheet" href="/zoom/zoom.css">
  <div>
    <img src="${(thumbnail || original)}" alt="${title}" data-action="zoom" class="photozoom">	
  </div>`;
});
```

如此一來，每當使用者插入 `{% raw %}{% zoom %}{% endraw %}` 時，就會被展開成包含 include 外部資源的 html code，來達成目的。


## Use Hexo Filter Inject Code

然而剛剛的方式有些小缺點，比方說當使用者插入很多 `{% raw %}{% zoom %}{% endraw %}` 的 tag 時，就會出現很多重複引用的程式碼，感覺也是怪怪的。
所以我最後利用另一種方式達到塞 code 的效果 － `Filter`。

Hexo Filter 提供很多 hook 的註冊點，比方說在渲染 html 之前執行註冊的 function ...等等。
我這邊用的是 `after_generate`，就是在全部檔案產生完成之後執行，詳細 hook 名稱跟意義可參考[文件](https://hexo.io/api/filter#Filter-List)

透過 `after_generate filter` 我可以在最後決定是否要插入外部資源 `zoom.{js,css}`，實作如下：

```js
hexo.extend.filter.register('after_generate', () => {
  const route = hexo.route;
  const routes = route.list().filter(path => path.endsWith('.html'));
  const map = routes.map(path => {
    return new Promise((resolve, reject) => {
      const html = route.get(path);
      let htmlTxt = '';
      html.on('data', chunk => (htmlTxt += chunk));
      html.on('end', () => {
        const $ = cheerio.load(htmlTxt, { decodeEntities: true });
        if ($('.photozoom').length) {
          $('body').append(`<script type="text/javascript">${fetch_asset(ZOOMJS_PATH)}</script>`);
          $('body').append(`<style>${fetch_asset(ZOOMCSS_PATH)}</style>`);              
          hexo.log.info(`[hexo-tag-photozoom] Injected assets to ${path}`);
        }
        resolve({ path, html: $.html() });
      });
    });
  });
  
  // update route
  return Promise.all(map).then(res =>
    res.map(obj => { route.set(obj.path, obj.html); }),
  );  
});
```

我去掃所有 html 檔案，並搜尋有沒有 `div` class name 是 `photozoom` 的，如果有那就直接在 html body 插入所需的 javascript 跟 css 程式碼，非常暴力但還不錯～
且這作法同時兼顧如果有使用者想在非文章內容的地方使用 `zoom.js` 的效果，只需要在 `<img>` 中加上 `photozoom` class name，在每次編譯時都會掃到並在需要的地方插入程式碼。


# Reference

1. [Hexo Filter](https://hexo.io/api/filter)
2. [Develop a plugin for Hexo - Github Card](https://blog.gisonrg.me/2016/04/develop-hexo-github-card/)

{% ref_style %}
