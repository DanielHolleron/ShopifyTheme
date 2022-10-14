window.store = {};



/**
 * Currency utility borrowed from slate.
 */
store.currency = (function() {
   var moneyFormat = '${{amount}}'; // eslint-disable-line camelcase
 
   function formatMoney(cents, format) {
      if (typeof cents === 'string') {
         cents = cents.replace('.', '');
      }
      var value = '';
      var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
      var formatString = format || moneyFormat;
 
      function formatWithDelimiters(number, precision, thousands, decimal) {
         thousands = thousands || ',';
         decimal = decimal || '.';
         if (isNaN(number) || number === null) { return 0; }
         number = (number / 100.0).toFixed(precision);
         var parts = number.split('.');
         var dollarsAmount = parts[0].replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
         var centsAmount = parts[1] ? decimal + parts[1] : '';
         return dollarsAmount + centsAmount;
      }
      
      switch (formatString.match(placeholderRegex)[1]) {
         case 'amount':
            value = formatWithDelimiters(cents, 2);
            break;
         case 'amount_no_decimals':
            value = formatWithDelimiters(cents, 0);
            break;
         case 'amount_with_comma_separator':
            value = formatWithDelimiters(cents, 2, '.', ',');
            break;
         case 'amount_no_decimals_with_comma_separator':
            value = formatWithDelimiters(cents, 0, '.', ',');
            break;
         case 'amount_no_decimals_with_space_separator':
            value = formatWithDelimiters(cents, 0, ' ');
            break;
         case 'amount_with_apostrophe_separator':
            value = formatWithDelimiters(cents, 2, "'");
            break;
      }
      return formatString.replace(placeholderRegex, value);
   }
 
   return {
     formatMoney: formatMoney
   };
})();


/**
 * System for controlling filters on collection pages.
 */
store.filters = {
   init() {
      store.queryParams = {};
      if (location.search.length) {
         var aKeyValue;
         var aCouples = location.search.substr(1).split('&');
         for (var i = 0; i < aCouples.length; i++) {
            aKeyValue = aCouples[i].split('=');
            if (aKeyValue.length > 1) {
               store.queryParams[ decodeURIComponent(aKeyValue[0]) ] = decodeURIComponent(aKeyValue[1]);
            }
         }
      }

      /* update current forms */
      [].forEach.call(document.querySelectorAll('.js-filter-form'), function(filterForm) {
         var selects = filterForm.querySelectorAll('select');
         if (store.queryParams.sort_by) {
            selects[1].value = store.queryParams.sort_by;
         }
      });      

      /* hook form submit buttons */
      [].forEach.call(document.querySelectorAll('.js-filter-form .commit_bttn'), function(submitButton) {
         submitButton.addEventListener('click', store.filters.onFilterSubmit, false);
      });
   },

   findAncestor: function(el, query) {
      while ((el = el.parentElement) && !el.classList.contains(query));
      return el;
   },

   onFilterSubmit: function(event) {
      var filterForm = store.filters.findAncestor(event.srcElement, 'js-filter-form');
      var selects = filterForm.querySelectorAll('select');

      if (store.queryParams.page) {
         delete store.queryParams.page;
      }
      
      var url = selects[0].value;
      if (url.includes('?')) {
         url = url.slice(0, url.indexOf('?'));
      }

      store.queryParams.sort_by = selects[1].value
      window.location = url + '?' + new URLSearchParams(Object.entries(store.queryParams)).toString();
   }
};



/**
 * Controls actions on the product page.
 */
window.productPage = {
   product: null,
   options: [],
   formElement: document.querySelector('[data-product-form]'),


   async init() {
      if (this.formElement && this.formElement.dataset.productHandle) {
         this.product = await this.getProductJson(this.formElement.dataset.productHandle);
         this.options = document.querySelectorAll('.single-option-selector');

         // handle what happens when any of the product options change.
         this.options.forEach(item => {
            item.addEventListener('change', event => {
               var variant = productPage.getSelectedVariant();
               console.log(variant);
               if (variant != null) {
                  document.querySelector('#selectable-variations').value = variant.id;
                  productPage.setIsAvailable(variant.available);
                  productPage.setChosenPrice(variant);
               }
               else {
                  productPage.setIsAvailable(false);
                  productPage.setChosenPrice(null);
               }
            })
         });

         // trigger the first change event to fire.
         if (this.options.length > 0) {
            this.options[0].dispatchEvent(new Event("change"));
         }
      }
   },


   setChosenPrice(variant) {
      var f = '£{{amount}}';
      var html = 'Not Available';
      var badges = '';

      if (variant != null) {
         if (variant.compare_at_price > variant.price) {
            var r_price = store.currency.formatMoney(variant.price, f);
            var s_price = store.currency.formatMoney(variant.compare_at_price, f);
            badges += '<span class="tag is-success" aria-hidden="true">Sale</span>';
            html = '<div class="price__sale">'
               + '<dt><span class="is-hidden is-inline">Sale price</span></dt>'
               + '<dd><span class="price-item price-item--sale">'+s_price+'</span></dd>'
               + '<div class="price__compare">'
               + '<dt><span class="is-hidden is-inline">Regular price</span></dt>'
               + '<dd><s class="price-item price-item--regular">'+r_price+'</s></dd>'
               + '</div></div>';
         }
         else {
            var r_price = store.currency.formatMoney(variant.price, f);
            html = '<div class="price__regular">'
               + '<dt><span class="is-hidden is-inline">Price</span></dt>'
               + '<dd><span class="price-item price-item--regular">'+r_price+'</span></dd>'
               + '</div>';
         }
      }

      if (badges.length > 0) {
         badges = '<div class="price__badges price__badges--listing">'+badges+'</div>';
      }

      document.querySelector('.price__pricing-group').innerHTML = html + badges;
   },


   setIsAvailable(available) {
      document.querySelector('button[name="add"]').disabled = available ? '' : "disabled";
   },


   getProductJson(handle) {
      return fetch(`/products/${handle}.js`).then((response) => {
        return response.json();
      });
   },


   /**
    * Get the currently selected options from add-to-cart form. Works with all form input elements.
    * @return {array} options - Values of currently selected variants
    */
   getSelectedOptions() {
      var result = [];
      this.options.forEach(function(option) {
         var type = option.getAttribute('type');
         var isRadioOrCheckbox = type === 'radio' || type === 'checkbox';
         if (!isRadioOrCheckbox || option.checked) {
            result.push({ value: option.value, index: option.getAttribute('data-index') });
         }
      });

      return result;
   },
   

   /**
    * Find variant based on selected values.
    * @param  {array} selectedValues - Values of variant inputs
    * @return {object || undefined} found - Variant object from product.variants
    */
   getSelectedVariant() {
      var selectedValues = this.getSelectedOptions();
      var variants = this.product.variants;
      var found = variants.find(function(variant) {
         return selectedValues.every(function(values) {
            return variant[values.index] === values.value;
         });
      });
      return found;
   },


   
};



/**
 * Controls hamburget menu, and search modals.
 */
window.modals = {
   init() {
      // Get all "navbar-burger" elements
      const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.nav_bttn'), 0);
      // Check if there are any navbar burgers
      if ($navbarBurgers.length > 0) {
         // Add a click event on each of them
         $navbarBurgers.forEach( el => {
            el.addEventListener('click', () => {
               // Get the target from the "data-target" attribute
               const target = el.dataset.target;
               const $target = document.getElementById(target);
               const $html = document.querySelector('html');
               // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"

               if ($target.classList.contains('is-active')) {
                  $target.classList.remove('is-active');
                  $html.classList.remove('sticky-modal');
               }
               else {
                  $target.classList.add('is-active');
                  if (el.dataset.sticky != null) $html.classList.add('sticky-modal');
               }

            });
         });
      }
   },

   showSearch() {
      document.querySelector('.search-popup').classList.remove('is-hidden');
   },

   hideSearch() {
      document.querySelector('.search-popup').classList.add('is-hidden');
   }
};



/**
 * Initialization
 */
store.filters.init();
productPage.init();
modals.init();