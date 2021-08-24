const { DateTime } = require('luxon')
const htmlmin = require('html-minifier')
const ErrorOverlay = require('eleventy-plugin-error-overlay')
const svgContents = require("eleventy-plugin-svg-contents")
const path = require ('path')
const Image = require('@11ty/eleventy-img')

async function imageShortcode(src, alt, cssClasses = "") {
  let sizes = "(min-width: 1024px) 100vw, 50vw"
  let srcPrefix = `./src/assets/images/`
  // ... so you don't have to enter path info for each ref, but also means you have to store them there --- which probably is best (IMHO)
  src = srcPrefix + src
  console.log(`Generating image(s) from:  ${src}`)
  if(alt === undefined) {
    // Throw an error on missing alt (alt="" works okay)
    throw new Error(`Missing \`alt\` on responsiveimage from: ${src}`)
  }  
  let metadata = await Image(src, {
    widths: [600, 900, 1400, 1800],
    formats: ['webp', 'jpeg'],
    urlPath: "/images/",
    outputDir: "./_site/images/",
    filenameFormat: function (id, src, width, format, options) {
      const extension = path.extname(src)
      const name = path.basename(src, extension)
      return `${name}-${width}w.${format}`
    }
  })  
  let lowsrc = metadata.jpeg[0]
  let highsrc = metadata.jpeg[metadata.jpeg.length - 1]
  return `<picture>
    ${Object.values(metadata).map(imageFormat => {
      return `  <source type="${imageFormat[0].sourceType}" srcset="${imageFormat.map(entry => entry.srcset).join(", ")}" sizes="${sizes}">`
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
  </picture>`
}

module.exports = function(eleventyConfig) {
  
  eleventyConfig.addNunjucksAsyncShortcode("image", imageShortcode)
  eleventyConfig.addLiquidShortcode("image", imageShortcode)
  // === Liquid needed if `markdownTemplateEngine` **isn't** changed from Eleventy default
  eleventyConfig.addJavaScriptFunction("image", imageShortcode)

  eleventyConfig.addPlugin(svgContents)

  eleventyConfig.setQuietMode(true)

  eleventyConfig.addPassthroughCopy('robots.txt')
  eleventyConfig.addPassthroughCopy('favicon.ico')
  eleventyConfig.addPassthroughCopy('./src/assets/js')
  eleventyConfig.addPassthroughCopy('./src/assets/svg')
  eleventyConfig.addPassthroughCopy('./src/images')

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

  eleventyConfig.setBrowserSyncConfig({
    ...eleventyConfig.browserSyncConfig,
    files: [
      "src/**/*.js",
      "src/assets/css/*.css",
      "src/**/*.md",
    ],
    ghostMode: false,
    port: 3000,
  })

  eleventyConfig.addPlugin(ErrorOverlay)

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
    const reviews = collectionApi.getFilteredByGlob("src/reviews/*.njk");

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
      includes: '_includes'
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