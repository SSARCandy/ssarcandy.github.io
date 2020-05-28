function search() {
    const searchIco = document.getElementById('search'),
        searchWrap = document.getElementById('search-wrap'),
        keyInput = document.getElementById('key'),
        back = document.getElementById('back'),
        searchPanel = document.getElementById('search-panel'),
        searchResult = document.getElementById('search-result'),
        searchTpl = document.getElementById('search-tpl').innerHTML;
    let searchData;

    function loadData(success) {

        if (!searchData) {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', '/content.json', true);

            xhr.onload = function() {
                if (this.status >= 200 && this.status < 300) {
                    const res = JSON.parse(this.response);
                    searchData = res instanceof Array ? res : res.posts;
                    success(searchData);
                } else {
                    console.error(this.statusText);
                }
            };

            xhr.onerror = function() {
                console.error(this.statusText);
            };

            xhr.send();

        } else {
            success(searchData);
        }
    }

    function tpl(html, data) {
        return html.replace(/\{\w+\}/g, function(str) {
            const prop = str.replace(/\{|\}/g, '');
            return data[prop] || '';
        });
    }

    const docEl = document[navigator.userAgent.indexOf('Firefox') !== -1 ? 'documentElement' : 'body'],
        noop = function() {};

    const Control = {
        show: function() {
            window.innerWidth < 760 ? docEl.classList.add('lock-size') : noop;
            searchPanel.classList.add('in');
        },
        hide: function() {
            window.innerWidth < 760 ? docEl.classList.remove('lock-size') : noop;
            searchPanel.classList.remove('in');
        }
    };

    function render(data) {
        const html = '';
        if (data.length) {

            html = data.map(function(post) {

                return tpl(searchTpl, {
                    title: post.title,
                    path: post.path,
                    date: new Date(post.date).toLocaleDateString(),
                    tags: post.tags.map(function(tag) {
                        return '<span>#' + tag.name + '</span>';
                    }).join('')
                });

            }).join('');

        } else {
            html = '<li class="tips"><i class="icon icon-coffee icon-3x"></i><p>Results not found!</p></li>';
        }

        searchResult.innerHTML = html;
    }
    function regtest(raw, regExp) {
        regExp.lastIndex = 0;
        return regExp.test(raw);
    }
    function matcher(post, regExp) {
        return regtest(post.title, regExp) || post.tags.some(function(tag) {
            return regtest(tag.name, regExp);
        }) || regtest(post.text, regExp);
    }

    function search(e) {
        const key = this.value.trim();
        if (!key) {
            return;
        }

        const regExp = new RegExp(key.replace(/[ ]/g, '|'), 'gmi');

        loadData(function(data) {

            const result = data.filter(function(post) {
                return matcher(post, regExp);
            });

            render(result);
            Control.show();
        });

        e.preventDefault();
    }


    searchIco.addEventListener('click', function() {
        searchWrap.classList.toggle('in');
        keyInput.value = '';
        document.getElementById('key').focus();
    });

    back.addEventListener('click', function() {
        searchWrap.classList.remove('in');
        Control.hide();
    });

    document.addEventListener('click', function(e) {
        if (e.target.id !== 'key') {
            Control.hide();
        }
    });

    keyInput.addEventListener('input', search);
    keyInput.addEventListener('click', search);

}