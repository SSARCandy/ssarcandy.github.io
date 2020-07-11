const imagemin = require('imagemin');
const webp = require('imagemin-webp');

(async ()=> {
  await imagemin(['source/img/projects/*.{jpg,png}'], {
    destination: 'public/img/projects',
    plugins: [webp({ lossless: true })],
  });
})();
