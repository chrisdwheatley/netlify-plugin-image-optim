const fs = require("fs");
const filesize = require("filesize");
const globby = require("globby");
const boxen = require("boxen");
const { red, green, bold } = require("chalk");
const { table, getBorderCharacters } = require("table");
const imagemin = require("imagemin-keep-folder");
const gifsicle = require("imagemin-gifsicle");
const optipng = require("imagemin-optipng");
const pngquant = require("imagemin-pngquant");
const svgo = require("imagemin-svgo");

module.exports = () => {
  return {
    name: "netlify-plugin-image-optim",

    postBuild: async config => {
      const files = {};
      const glob = `${config.constants.BUILD_DIR}/**/*.{gif,jpg,jpeg,png,svg}`;
      const paths = await globby(glob);

      paths.map(path => {
        const stats = fs.statSync(path);

        files[path] = {
          pre: stats.size
        };

        return null;
      });

      const optimizedFiles = await imagemin([glob], {
        plugins: [gifsicle(), optipng(), pngquant(), svgo()]
      });

      optimizedFiles.map(file => {
        const { path } = file;
        const stats = fs.statSync(path);

        files[path].post = stats.size;
        files[path].diff = files[path].pre - files[path].post;

        return null;
      });

      const totalSaved = Object.keys(files).reduce((total, filename) => {
        return files[filename].diff + total;
      }, 0);

      const formattedData = Object.keys(files).map(filename => {
        return [
          filename.replace(config.constants.BUILD_DIR, ""),
          red(filesize(files[filename].pre)),
          green(filesize(files[filename].post)),
          green.bold(filesize(files[filename].diff))
        ];
      });

      const data = [
        [bold("File"), bold("Before"), bold("After"), bold("Reduction")],
        ...formattedData
      ];

      console.log(
        table(data, {
          border: getBorderCharacters(`norc`),
          drawHorizontalLine: index => {
            return index === 1;
          }
        })
      );

      console.log(
        boxen(bold(`Images optimized - ${green(filesize(totalSaved))} saved`), {
          padding: {
            left: 3,
            right: 3
          },
          borderColor: "green"
        })
      );
    }
  };
};
