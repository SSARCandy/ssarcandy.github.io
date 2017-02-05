var gulp = require('gulp');
var cleanCSS = require('gulp-clean-css');
 
gulp.task('default', function() {
    return gulp.src('public/css/**/*.css')
        .pipe(cleanCSS({compatibility: 'ie8'}))
        .pipe(gulp.dest('public/css/'));
});