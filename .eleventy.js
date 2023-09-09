const { DateTime } = require('luxon')
const htmlmin = require('html-minifier')
const svgContents = require("eleventy-plugin-svg-contents")
const path = require ('path')
const Image = require('@11ty/eleventy-img')
const slugify = require('slugify') // Disponible parce que slugify fait partie intégrante d'Eleventy
const fs = require('fs');

/**
 * 
 * @param {*} src 
 * @param {*} alt 
 * @param {*} cssClasses 
 * @param {object} source Un objet contenant deux membres, `url` et `name`. Permet d'ajouter un lien vers la source de l'image.
 * @returns 
 */
function imageShortcode(src, alt, cssClasses = "", source = null) {
  let sizes = "(min-width: 1024px) 100vw, 50vw"
  let srcPrefix = `./src/assets/images/`
  // ... so you don't have to enter path info for each ref, but also means you have to store them there --- which probably is best (IMHO)
  src = srcPrefix + src
  console.log(`----|---- Generating image(s) from: ${src} ----|----`)
  
  if(alt === undefined) {
    // Throw an error on missing alt (alt="" works okay)
    throw new Error(`Missing \`alt\` on responsiveimage from: ${src}`)
  }  

  const imageCreationOptions = {
    widths: [320, 600, 750, 900, 1400, 1800],
    formats: ['webp', 'jpeg'],
    urlPath: "/images/",
    outputDir: "./_site/images/",
    filenameFormat: function (id, src, width, format, options) {
      const extension = path.extname(src);
      const name = slugify(path.basename(src).toLowerCase());
      const dirname = path.dirname(src).replace('./src/assets/images/', '');
      return `${dirname}-${name}-${width}w.${format}`;
    }
  };

  /**
   * Appel qui va créer le fichier d'image pour vrai.
   * Voir https://github.com/11ty/eleventy-img/issues/81
   * Voir https://www.11ty.dev/docs/plugins/image/#synchronous-usage
   */
  Image(src, imageCreationOptions);
  let metadata = Image.statsSync(src, imageCreationOptions);

  let lowsrc = metadata.jpeg[0]
  let highsrc = metadata.jpeg[metadata.jpeg.length - 1]
  let sourceText = source != null ? `<div class="image-source">Image Source: <a href="${source.url}">${source.name}</a></div>` : "";
  return `<picture>
    ${Object.values(metadata).map(imageFormat => {
      return `  <source type="${imageFormat[0].sourceType}" srcset="${imageFormat.map(entry => encodeURI(entry.url) + ` ${entry.width}w`).join(", ")}" sizes="${sizes}">`
    }).join("\n")}
    <img
      class="${ cssClasses ? cssClasses : 'mx-auto'}"
      src="${lowsrc.url}"
      width="${highsrc.width}"
      height="${highsrc.height}"
      alt="${alt}"
      title="${alt}"
      loading="lazy"
      decoding="async">
  </picture>
  ${sourceText}`
}

function copyrightYear(startYear) {
  const thisYear = new Date().getFullYear();
  return (thisYear != startYear ? `${startYear}-${thisYear}` : `${startYear}`);
}

const getSimilarTags = (tagsFirstItem, tagsSecondItem) => tagsFirstItem.filter(Set.prototype.has, new Set(tagsSecondItem)).length;

module.exports = function(eleventyConfig) {
  eleventyConfig.addNunjucksShortcode("image", imageShortcode);
  eleventyConfig.addLiquidShortcode("image", imageShortcode);
  eleventyConfig.addJavaScriptFunction("image", imageShortcode);
  eleventyConfig.addNunjucksShortcode("copyrightYear", copyrightYear);
  eleventyConfig.addLiquidShortcode("copyrightYear", copyrightYear);
  eleventyConfig.addJavaScriptFunction("copyrightYear", copyrightYear);

  eleventyConfig.addPlugin(svgContents)

  eleventyConfig.setQuietMode(true)

  eleventyConfig.addPassthroughCopy('robots.txt')
  eleventyConfig.addPassthroughCopy('favicon.ico')
  eleventyConfig.addPassthroughCopy('./src/assets/js')
  eleventyConfig.addPassthroughCopy('./src/assets/svg')
  eleventyConfig.addPassthroughCopy('./src/images')

  eleventyConfig.addNunjucksFilter("limit", (arrayToProcess, limit) => arrayToProcess.slice(0, limit));

  eleventyConfig.addFilter("removeUselessTags", (tagsArray) => tagsArray.filter((currentItem) => ['shortform', 'mediumform', 'longform'].indexOf(currentItem) == -1));

  eleventyConfig.addFilter("printFormType", (tagsArray) => {
    if(! tagsArray || ! tagsArray.length) {
      return '';
    }

    if(tagsArray.indexOf('longform') > -1 ) {
      return 'Long';
    } else if(tagsArray.indexOf('mediumform') > -1 ) {
      return 'Medium'
    } else if(tagsArray.indexOf('shortform') > -1 ) {
      return 'Short'
    }
  });

  eleventyConfig.addFilter("similarGames", (collection, path, tags) => {
    const result = collection.filter((post) => {
      return getSimilarTags(post.data.tags, tags) >= 1 && post.inputPath !== path;
    }).sort((firstItem, secondItem) => {
      return getSimilarTags(secondItem.data.tags, tags) - getSimilarTags(firstItem.data.tags, tags);
    });

    return result;
  });

  eleventyConfig.addFilter("readableDate", dateObject => {
    return DateTime.fromJSDate(dateObject, {zone: 'utc'}).toFormat("dd LLL yyyy")
  });

  // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
  eleventyConfig.addFilter('displayMonthYear', dateObject => {
    return DateTime.fromJSDate(dateObject).toFormat('MMMM yyyy')
  });

  eleventyConfig.addFilter('htmlDateString', dateObject => {
    return DateTime.fromJSDate(dateObject).toFormat('MMMM d, yyyy')
  });

  eleventyConfig.addFilter('dateStringISO', dateObject => {
    return DateTime.fromJSDate(dateObject).toFormat('yyyy-MM-dd')
  });

  eleventyConfig.addFilter('dateFromTimestamp', timestamp => {
    return DateTime.fromISO(timestamp, { zone: 'utc' }).toJSDate()
  });

  eleventyConfig.addFilter('dateFromRFC2822', timestamp => {
    return DateTime.fromJSDate(timestamp).toISO()
  });

  eleventyConfig.addFilter('readableDateFromISO', dateObject => {
    return DateTime.fromISO(dateObject).toFormat('LLL d, yyyy h:mm:ss a ZZZZ')
  });

  eleventyConfig.addFilter('getPermalink', inputPath => `/reviews/${path.basename(inputPath, path.extname(inputPath))}/`);

  eleventyConfig.addFilter("keys", obj => Object.keys(obj));

  eleventyConfig.addFilter("except", (startingData=[], valuesToDelete = []) => {
    const newData = startingData.filter((currentItem) => valuesToDelete.indexOf(currentItem) == -1);
    return newData.sort();
  });

  // https://www.11ty.dev/docs/layouts/
  eleventyConfig.addLayoutAlias("base", "layouts/_default/base.njk");
  eleventyConfig.addLayoutAlias("review", "layouts/_default/review.njk");
  eleventyConfig.addLayoutAlias("index", "layouts/_default/index.njk");
  eleventyConfig.addLayoutAlias("page", "layouts/_default/page.njk");

  /* Markdown plugins */
  // https://www.11ty.dev/docs/languages/markdown/
  // --and-- https://github.com/11ty/eleventy-base-blog/blob/master/.eleventy.js
  // --and-- https://github.com/planetoftheweb/seven/blob/master/.eleventy.js
  let markdownIt = require("markdown-it")
  let markdownItFootnote = require("markdown-it-footnote")
  let markdownItPrism = require('markdown-it-prism')
  let markdownItBrakSpans = require('markdown-it-bracketed-spans')
  let markdownItLinkAttrs = require('markdown-it-link-attributes')
  let markdownItOpts = {
    html: true,
    linkify: false,
    typographer: true
  }
  const markdownEngine = markdownIt(markdownItOpts)
  markdownEngine.use(markdownItFootnote)
  markdownEngine.use(markdownItPrism)
  markdownEngine.use(markdownItBrakSpans)
  markdownEngine.use(markdownItLinkAttrs, {
    pattern: /^https:/,
    attrs: {
      target: '_blank',
      rel: 'noreferrer noopener'
    }
  })
  // START, de-bracketing footnotes
  //--- see http://dirtystylus.com/2020/06/15/eleventy-markdown-and-footnotes/
  markdownEngine.renderer.rules.footnote_caption = (tokens, idx) => {
    let n = Number(tokens[idx].meta.id + 1).toString()
    if (tokens[idx].meta.subId > 0) {
      n += ":" + tokens[idx].meta.subId
    }
    return n
  }
  // END, de-bracketing footnotes
  eleventyConfig.setLibrary("md", markdownEngine)

  eleventyConfig.addWatchTarget("src/**/*.js")
  eleventyConfig.addWatchTarget("./src/assets/css/*.css")
  eleventyConfig.addWatchTarget("./src/**/*.md")

  eleventyConfig.setServerOptions({
    watch: [
      "src/**/*.js",
      "src/assets/css/*.css",
      "src/**/*.md",
    ],
    port: 3000,
  })

  eleventyConfig.addTransform("htmlmin", function(content, outputPath) {
    if( outputPath.endsWith(".html") ) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true
      })
      return minified
    }
    return content
  })

  eleventyConfig.addCollection("reviews", function(collectionApi) {
    const reviews = collectionApi.getFilteredByGlob("src/reviews/*.njk").sort((firstReview, secondReview) => firstReview.data.creationDate < secondReview.data.creationDate ? 1 : -1);
    // Ajout d'un lien vers la critique précédente et suivante, s'il y a lieu.
    for(let reviewCounter = 0; reviewCounter < reviews.length; reviewCounter++) {
      if(reviews[reviewCounter - 1]) {
        reviews[reviewCounter].data["previousReview"] = reviews[reviewCounter - 1]
      }

      if(reviews[reviewCounter + 1]) {
        reviews[reviewCounter].data["nextReview"] = reviews[reviewCounter + 1]
      }
    }

    return reviews;
  })

  /* pathPrefix: "/"; */
  return {
    dir: {
      input: 'src', // <--- everything else in 'dir' is relative to this directory! https://www.11ty.dev/docs/config/#directory-for-includes
      data: '../_data',
      includes: '_includes',
    },
    templateFormats: [
      'html',
      'md',
      'njk',
      '11ty.js'
    ],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    passthroughFileCopy: true,
  }
}