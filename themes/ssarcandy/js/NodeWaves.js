import Waves from 'node-waves';

Waves.init();
Waves.attach('.global-share li', ['waves-block']);
Waves.attach('.article-tag-list-link, #page-nav a, #page-nav span', ['waves-button']);

