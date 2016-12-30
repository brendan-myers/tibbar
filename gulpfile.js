const gulp = require('gulp');
const babel = require('gulp-babel');
const rm = require('gulp-rimraf');

const paths = {
	scripts: 'src/**/*.js',
	lib: 'lib/*',
};

gulp.task('clean', function() {
	return gulp.src([paths.lib]).pipe(rm());
});

gulp.task('compile', ['clean'], function() {
	return gulp.src(paths.scripts)
		.pipe(babel({ presets: ['es2015'] }))
		.pipe(gulp.dest('./lib'));
});

gulp.task('test', ['compile'], function() {
	
});

gulp.task('default', ['compile']);