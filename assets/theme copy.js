window.theme = window.theme || {};

/* ================ SLATE ================ */
window.theme = window.theme || {};


theme.Sections = function Sections() {
   this.constructors = {};
   this.instances = [];
   document.addEventListener('shopify:section:load', this._onSectionLoad.bind(this));
   document.addEventListener('shopify:section:unload', this._onSectionUnload.bind(this));
   document.addEventListener('shopify:section:select', this._onSelect.bind(this));
   document.addEventListener('shopify:section:deselect', this._onDeselect.bind(this));
   document.addEventListener('shopify:block:select', this._onBlockSelect.bind(this));
   document.addEventListener('shopify:block:deselect', this._onBlockDeselect.bind(this));
};


theme.Sections.prototype = Object.assign({}, theme.Sections.prototype, {
   _createInstance: function(container, constructor) {
      var id = container.getAttribute('data-section-id');
      var type = container.getAttribute('data-section-type');
      constructor = constructor || this.constructors[type];
      
      if (typeof constructor === 'undefined') { return; }

      var instance = Object.assign(new constructor(container), {
         id: id,
         type: type,
         container: container
      });
      
      this.instances.push(instance);
   },

   _onSectionLoad: function(evt) {
      var container = document.querySelector(
         '[data-section-id="' + evt.detail.sectionId + '"]'
      );
      if (container) {
         this._createInstance(container);
      }
   },

   _onSectionUnload: function(evt) {
      this.instances = this.instances.filter(function(instance) {
         var isEventInstance = instance.id === evt.detail.sectionId;
         if (isEventInstance) {
            if (typeof instance.onUnload === 'function') {
               instance.onUnload(evt);
            }
         }
         return !isEventInstance;
      });
   },

   _onSelect: function(evt) {
      // eslint-disable-next-line no-shadow
      var instance = this.instances.find(function(instance) {
         return instance.id === evt.detail.sectionId;
      });
      if (typeof instance !== 'undefined' && typeof instance.onSelect === 'function') {
         instance.onSelect(evt);
      }
   },

   _onDeselect: function(evt) {
      // eslint-disable-next-line no-shadow
      var instance = this.instances.find(function(instance) {
         return instance.id === evt.detail.sectionId;
      });

      if (typeof instance !== 'undefined' && typeof instance.onDeselect === 'function') {
         instance.onDeselect(evt);
      }
   },

   _onBlockSelect: function(evt) {
      // eslint-disable-next-line no-shadow
      var instance = this.instances.find(function(instance) {
         return instance.id === evt.detail.sectionId;
      });

      if (typeof instance !== 'undefined' && typeof instance.onBlockSelect === 'function') {
         instance.onBlockSelect(evt);
      }
   },


   _onBlockDeselect: function(evt) {
      // eslint-disable-next-line no-shadow
      var instance = this.instances.find(function(instance) {
         return instance.id === evt.detail.sectionId;
      });

      if (typeof instance !== 'undefined' && typeof instance.onBlockDeselect === 'function') {
         instance.onBlockDeselect(evt);
      }
   },

   register: function(type, constructor) {
      this.constructors[type] = constructor;
      document.querySelectorAll('[data-section-type="' + type + '"]').forEach(
         function(container) {
            this._createInstance(container, constructor);
         }.bind(this)
      );
   }
});


window.slate = window.slate || {};
slate.utils = {
   /**
    * Get the query params in a Url
    * Ex
    * https://mysite.com/search?q=noodles&b
    * getParameterByName('q') = "noodles"
    * getParameterByName('b') = "" (empty value)
    * getParameterByName('test') = null (absent)
    */
   getParameterByName: function(name, url) {
      if (!url) url = window.location.href;
      name = name.replace(/[[\]]/g, '\\$&');
      var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
          results = regex.exec(url);
      if (!results) return null;
      if (!results[2]) return '';
      return decodeURIComponent(results[2].replace(/\+/g, ' '));
   },

   keyboardKeys: {
      TAB: 9,
      ENTER: 13,
      ESCAPE: 27,
      LEFTARROW: 37,
      RIGHTARROW: 39
   }
};


window.slate = window.slate || {};


/**
 * Variant Selection scripts
 * ------------------------------------------------------------------------------
 * Handles change events from the variant inputs in any `cart/add` forms that may
 * exist.  Also updates the master select and triggers updates when the variants
 * price or image changes.
 * @namespace variants
 */
slate.Variants = (function() {
   function Variants(options) {
      this.container = options.container;
      this.product = options.product;
      this.originalSelectorId = options.originalSelectorId;
      this.enableHistoryState = options.enableHistoryState;
      this.singleOptions = this.container.querySelectorAll(
         options.singleOptionSelector
      );
      this.currentVariant = this._getVariantFromOptions();
      this.singleOptions.forEach(
         function(option) {
            option.addEventListener('change', this._onSelectChange.bind(this));
         }.bind(this)
      );
   }

   Variants.prototype = Object.assign({}, Variants.prototype, {
      /**
       * Get the currently selected options from add-to-cart form. Works with all
       * form input elements.
       * @return {array} options - Values of currently selected variants
       */
      _getCurrentOptions: function() {
         var result = [];
         this.singleOptions.forEach(function(option) {
            var type = option.getAttribute('type');
            var isRadioOrCheckbox = type === 'radio' || type === 'checkbox';
            if (!isRadioOrCheckbox || option.checked) {
               result.push({
                  value: option.value,
                  index: option.getAttribute('data-index')
               });
            }
         });
         return result;
      },

      /**
       * Find variant based on selected values.
       * @param  {array} selectedValues - Values of variant inputs
       * @return {object || undefined} found - Variant object from product.variants
       */
      _getVariantFromOptions: function() {
         var selectedValues = this._getCurrentOptions();
         var variants = this.product.variants;
         var found = variants.find(function(variant) {
            return selectedValues.every(function(values) {
               return variant[values.index] === values.value;
            });
         });
         return found;
      },

      /**
       * Event handler for when a variant input changes.
       */
      _onSelectChange: function() {
         var variant = this._getVariantFromOptions();
         this.container.dispatchEvent(new CustomEvent('variantChange', {
            detail: { variant: variant },
            bubbles: true,
            cancelable: true
         }));

         if (!variant) { return; }
         this._updateMasterSelect(variant);
         this._updateImages(variant);
         this._updatePrice(variant);
         this._updateSKU(variant);
         this.currentVariant = variant;

         if (this.enableHistoryState) { this._updateHistoryState(variant); }
      },

      /**
       * Trigger event when variant image changes
       * @param  {object} variant - Currently selected variant
       * @return {event}  variantImageChange
       */
      _updateImages: function(variant) {
         var variantImage = variant.featured_image || {};
         var currentVariantImage = this.currentVariant.featured_image || {};
         if (!variant.featured_image || variantImage.src === currentVariantImage.src) {
            return;
         }

         this.container.dispatchEvent(new CustomEvent('variantImageChange', {
            detail: { variant: variant },
            bubbles: true,
            cancelable: true
         }));
      },

      /**
       * Trigger event when variant price changes.
       * @param  {object} variant - Currently selected variant
       * @return {event} variantPriceChange
       */
      _updatePrice: function(variant) {
         if (variant.price === this.currentVariant.price &&
             variant.compare_at_price === this.currentVariant.compare_at_price) {
            return;
         }
         this.container.dispatchEvent(new CustomEvent('variantPriceChange', {
            detail: { variant: variant },
            bubbles: true,
            cancelable: true
         }));
      },

      /**
       * Trigger event when variant sku changes.
       * @param  {object} variant - Currently selected variant
       * @return {event} variantSKUChange
       */
      _updateSKU: function(variant) {
         if (variant.sku === this.currentVariant.sku) { return; }
         this.container.dispatchEvent(new CustomEvent('variantSKUChange', {
            detail: { variant: variant },
            bubbles: true,
            cancelable: true
         }));
      },

      /**
       * Update history state for product deeplinking
       * @param  {variant} variant - Currently selected variant
       * @return {k} [description]
       */
      _updateHistoryState: function(variant) {
         if (!history.replaceState || !variant) { return; }
         var newurl = window.location.protocol + '//' + window.location.host +
                      window.location.pathname + '?variant=' + variant.id;
         window.history.replaceState({ path: newurl }, '', newurl);
      },

      /**
       * Update hidden master select of variant change
       * @param  {variant} variant - Currently selected variant
       */
      _updateMasterSelect: function(variant) {
         var masterSelect = this.container.querySelector(this.originalSelectorId);
         if (!masterSelect) return;
         masterSelect.value = variant.id;
      }
   });
   return Variants;
})();


this.Shopify = this.Shopify || {};
this.Shopify.theme = this.Shopify.theme || {};


theme.ProductModel = (function() {
   var modelJsonSections = {};
   var models = {};
   var xrButtons = {};
   var selectors = {
      mediaGroup: '[data-product-single-media-group]',
      xrButton: '[data-shopify-xr]'
   };
   
   function init(modelViewerContainers, sectionId) {
      modelJsonSections[sectionId] = {
         loaded: false
      };

      modelViewerContainers.forEach(function(modelViewerContainer, index) {
         var mediaId = modelViewerContainer.getAttribute('data-media-id');
         var modelViewerElement = modelViewerContainer.querySelector('model-viewer');
         var modelId = modelViewerElement.getAttribute('data-model-id');
         if (index === 0) {
            var mediaGroup = modelViewerContainer.closest(selectors.mediaGroup);
            var xrButton = mediaGroup.querySelector(selectors.xrButton);
            xrButtons[sectionId] = {
               element: xrButton,
               defaultId: modelId
            };
         }
         models[mediaId] = {
            modelId: modelId,
            sectionId: sectionId,
            container: modelViewerContainer,
            element: modelViewerElement
         };
      });

      window.Shopify.loadFeatures([
         {
            name: 'shopify-xr',
            version: '1.0',
            onLoad: setupShopifyXr
         },
         {
            name: 'model-viewer-ui',
            version: '1.0',
            onLoad: setupModelViewerUi
         }
      ]);
      theme.LibraryLoader.load('modelViewerUiStyles');
   }

   function setupShopifyXr(errors) {
      if (errors) return;
      if (!window.ShopifyXR) {
         document.addEventListener('shopify_xr_initialized', function() {
            setupShopifyXr();
         });
         return;
      }

      for (var sectionId in modelJsonSections) {
         if (modelJsonSections.hasOwnProperty(sectionId)) {
            var modelSection = modelJsonSections[sectionId];
            if (modelSection.loaded) continue;
            var modelJson = document.querySelector('#ModelJson-' + sectionId);
            window.ShopifyXR.addModels(JSON.parse(modelJson.innerHTML));
            modelSection.loaded = true;
         }
      } 
      window.ShopifyXR.setupXRElements();
   }

   function setupModelViewerUi(errors) {
      if (errors) return;
      for (var key in models) {
         if (models.hasOwnProperty(key)) {
            var model = models[key];
            if (!model.modelViewerUi) {
               model.modelViewerUi = new Shopify.ModelViewerUI(model.element);
            }
            setupModelViewerListeners(model);
         }
      }
   }
   
   function setupModelViewerListeners(model) {
      var xrButton = xrButtons[model.sectionId];
      model.container.addEventListener('mediaVisible', function() {
         xrButton.element.setAttribute('data-shopify-model3d-id', model.modelId);
         if (theme.Helpers.isTouch()) return;
         model.modelViewerUi.play();
      });
      model.container.addEventListener('mediaHidden', function() {
         xrButton.element.setAttribute('data-shopify-model3d-id', xrButton.defaultId);
         model.modelViewerUi.pause();
      });
      model.container.addEventListener('xrLaunch', function() {
         model.modelViewerUi.pause();
      });
   }

   function removeSectionModels(sectionId) {
      for (var key in models) {
         if (models.hasOwnProperty(key)) {
            var model = models[key];
            if (model.sectionId === sectionId) {
               models[key].modelViewerUi.destroy();
               delete models[key];
            }
         }
      }
      delete modelJsonSections[sectionId];
   }

   return { init: init, removeSectionModels: removeSectionModels };
})();


window.theme = window.theme || {};


theme.Cart = (function() {
   var selectors = {
      cartCount: '[data-cart-count]',
      cartCountBubble: '[data-cart-count-bubble]',
      cartDiscount: '[data-cart-discount]',
      cartDiscountTitle: '[data-cart-discount-title]',
      cartDiscountAmount: '[data-cart-discount-amount]',
      cartDiscountWrapper: '[data-cart-discount-wrapper]',
      cartErrorMessage: '[data-cart-error-message]',
      cartErrorMessageWrapper: '[data-cart-error-message-wrapper]',
      cartItem: '[data-cart-item]',
      cartItemDetails: '[data-cart-item-details]',
      cartItemDiscount: '[data-cart-item-discount]',
      cartItemDiscountedPriceGroup: '[data-cart-item-discounted-price-group]',
      cartItemDiscountTitle: '[data-cart-item-discount-title]',
      cartItemDiscountAmount: '[data-cart-item-discount-amount]',
      cartItemDiscountList: '[data-cart-item-discount-list]',
      cartItemFinalPrice: '[data-cart-item-final-price]',
      cartItemImage: '[data-cart-item-image]',
      cartItemLinePrice: '[data-cart-item-line-price]',
      cartItemOriginalPrice: '[data-cart-item-original-price]',
      cartItemPrice: '[data-cart-item-price]',
      cartItemPriceList: '[data-cart-item-price-list]',
      cartItemProperty: '[data-cart-item-property]',
      cartItemPropertyName: '[data-cart-item-property-name]',
      cartItemPropertyValue: '[data-cart-item-property-value]',
      cartItemRegularPriceGroup: '[data-cart-item-regular-price-group]',
      cartItemRegularPrice: '[data-cart-item-regular-price]',
      cartItemTitle: '[data-cart-item-title]',
      cartItemOption: '[data-cart-item-option]',
      cartItemSellingPlanName: '[data-cart-item-selling-plan-name]',
      cartLineItems: '[data-cart-line-items]',
      cartNote: '[data-cart-notes]',
      cartQuantityErrorMessage: '[data-cart-quantity-error-message]',
      cartQuantityErrorMessageWrapper: '[data-cart-quantity-error-message-wrapper]',
      cartRemove: '[data-cart-remove]',
      cartStatus: '[data-cart-status]',
      cartSubtotal: '[data-cart-subtotal]',
      cartTableCell: '[data-cart-table-cell]',
      cartWrapper: '[data-cart-wrapper]',
      emptyPageContent: '[data-empty-page-content]',
      quantityInput: '[data-quantity-input]',
      quantityInputMobile: '[data-quantity-input-mobile]',
      quantityInputDesktop: '[data-quantity-input-desktop]',
      quantityLabelMobile: '[data-quantity-label-mobile]',
      quantityLabelDesktop: '[data-quantity-label-desktop]',
      inputQty: '[data-quantity-input]',
      thumbnails: '.cart__image',
      unitPrice: '[data-unit-price]',
      unitPriceBaseUnit: '[data-unit-price-base-unit]',
      unitPriceGroup: '[data-unit-price-group]'
   };

   var classes = {
      cartNoCookies: 'cart--no-cookies',
      cartRemovedProduct: 'cart__removed-product',
      thumbnails: 'cart__image',
      hide: 'hide',
      inputError: 'input--error'
   };

   var attributes = {
      cartItemIndex: 'data-cart-item-index',
      cartItemKey: 'data-cart-item-key',
      cartItemQuantity: 'data-cart-item-quantity',
      cartItemTitle: 'data-cart-item-title',
      cartItemUrl: 'data-cart-item-url',
      quantityItem: 'data-quantity-item'
   };

   function Cart(container) {
      this.container = container;
      this.thumbnails = this.container.querySelectorAll(selectors.thumbnails);
      this.quantityInputs = this.container.querySelectorAll(selectors.inputQty);
      this.ajaxEnabled = this.container.getAttribute('data-ajax-enabled') === 'true';
      this._handleInputQty = theme.Helpers.debounce(this._handleInputQty.bind(this), 500);
      this.setQuantityFormControllers = this.setQuantityFormControllers.bind(this);
      this._onNoteChange = this._onNoteChange.bind(this);
      this._onRemoveItem = this._onRemoveItem.bind(this);
      if (!theme.Helpers.cookiesEnabled()) {
         this.container.classList.add(classes.cartNoCookies);
      }

      this.thumbnails.forEach(function(element) {
         element.style.cursor = 'pointer';
      });
   
      this.container.addEventListener('click', this._handleThumbnailClick);
      this.container.addEventListener('change', this._handleInputQty);
      this.setQuantityFormControllers();

      if (this.ajaxEnabled) {
         /**
          * Because the entire cart is recreated when a cart item is updated,
          * we cannot cache the elements in the cart. Instead, we add the event
          * listeners on the cart's container to allow us to retain the event
          * listeners after rebuilding the cart when an item is updated.
          */
         this.container.addEventListener('click', this._onRemoveItem);
         this.container.addEventListener('change', this._onNoteChange);
         this._setupCartTemplates();
      }
   }

   Cart.prototype = Object.assign({}, Cart.prototype, {
      _setupCartTemplates: function() {
         var cartItem = this.container.querySelector(selectors.cartItem);
         if (!cartItem) return;

         this.itemTemplate = this.container.querySelector(selectors.cartItem).cloneNode(true);
         this.itemDiscountTemplate = this.itemTemplate.querySelector(selectors.cartItemDiscount).cloneNode(true);
         this.cartDiscountTemplate = this.container.querySelector(selectors.cartDiscount).cloneNode(true);
         this.itemPriceListTemplate = this.itemTemplate.querySelector(selectors.cartItemPriceList).cloneNode(true);
         this.itemOptionTemplate = this.itemTemplate.querySelector(selectors.cartItemOption).cloneNode(true);
         this.itemPropertyTemplate = this.itemTemplate.querySelector(selectors.cartItemProperty).cloneNode(true);
         this.itemSellingPlanNameTemplate = this.itemTemplate.querySelector(selectors.cartItemSellingPlanName).cloneNode(true);
      },

      _handleInputQty: function(evt) {
         if (!evt.target.hasAttribute('data-quantity-input')) return;
         var input = evt.target;
         var itemElement = input.closest(selectors.cartItem);
         var itemIndex = Number(input.getAttribute('data-quantity-item'));
         var itemQtyInputs = this.container.querySelectorAll(
            "[data-quantity-item='" + itemIndex + "']"
         );
         var value = parseInt(input.value);
         var isValidValue = !(value < 0 || isNaN(value));
         itemQtyInputs.forEach(function(element) { element.value = value; });
         this._hideCartError();
         this._hideQuantityErrorMessage();
         
         if (!isValidValue) {
            this._showQuantityErrorMessages(itemElement);
            return;
         }

         if (isValidValue && this.ajaxEnabled) {
            this._updateItemQuantity(itemIndex, itemElement, itemQtyInputs, value);
         }
      },

      _updateItemQuantity: function(itemIndex, itemElement, itemQtyInputs, value) {
         var key = itemElement.getAttribute(attributes.cartItemKey);
         var index = Number(itemElement.getAttribute(attributes.cartItemIndex));
         var request = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;' },
            body: JSON.stringify({
               line: index,
               quantity: value
            })
         };
         fetch('/cart/change.js', request)
            .then(function(response) {
               return response.json();
            })
            .then(function(state) {
               this._setCartCountBubble(state.item_count);
               if (!state.item_count) {
                  this._emptyCart();
                  return;
               }
               this._createCart(state);
               if (!value) {
                  this._showRemoveMessage(itemElement.cloneNode(true));
                  return;
               }
               var lineItem = document.querySelector("[data-cart-item-key='" + key + "']");
               var item = this.getItem(key, state);
               var inputSelector = selectors.quantityInputDesktop;
               this._updateLiveRegion(item);
               if (!lineItem) return;
               lineItem.querySelector(inputSelector).focus();
            }.bind(this)
         )
         .catch(
            function() {
               this._showCartError(null);
            }.bind(this)
         );
      },

      getItem: function(key, state) {
         return state.items.find(function(item) {
            return item.key === key;
         });
      },

      _liveRegionText: function(item) {
         // Dummy content for live region
         var liveRegionText = theme.strings.update + ': [QuantityLabel]: [Quantity], [Regular] [$$] [DiscountedPrice] [$]. [PriceInformation]';
         // Update Quantity
         liveRegionText = liveRegionText.replace('[QuantityLabel]', theme.strings.quantity).replace('[Quantity]', item.quantity);
         // Update pricing information
         var regularLabel = '';
         var regularPrice = theme.Currency.formatMoney(item.original_line_price, theme.moneyFormat);
         var discountLabel = '';
         var discountPrice = '';
         var discountInformation = '';
         if (item.original_line_price > item.final_line_price) {
            regularLabel = theme.strings.regularTotal;
            discountLabel = theme.strings.discountedTotal;
            discountPrice = theme.Currency.formatMoney(
               item.final_line_price,
               theme.moneyFormat
            );
            discountInformation = theme.strings.priceColumn;
         }
         liveRegionText = liveRegionText
            .replace('[Regular]', regularLabel)
            .replace('[$$]', regularPrice)
            .replace('[DiscountedPrice]', discountLabel)
            .replace('[$]', discountPrice)
            .replace('[PriceInformation]', discountInformation)
            .trim();
         return liveRegionText;
      },

      _updateLiveRegion: function(item) {
         if (!item) return;
         var liveRegion = this.container.querySelector(selectors.cartStatus);
         liveRegion.textContent = this._liveRegionText(item);
         liveRegion.setAttribute('aria-hidden', false);
         setTimeout(function() {
            liveRegion.setAttribute('aria-hidden', true);
         }, 1000);
      },

      _createCart: function(state) {
         var cartDiscountList = this._createCartDiscountList(state);
         var cartTable = this.container.querySelector(selectors.cartLineItems);
         cartTable.innerHTML = '';
         this._createLineItemList(state).forEach(function(lineItem) {
            cartTable.appendChild(lineItem);
         });
         this.setQuantityFormControllers();
         this.cartNotes = this.cartNotes || this.container.querySelector(selectors.cartNote);
         if (this.cartNotes) {
            this.cartNotes.value = state.note;
         }
         var discountWrapper = this.container.querySelector(selectors.cartDiscountWrapper);
         if (cartDiscountList.length === 0) {
            discountWrapper.innerHTML = '';
            discountWrapper.classList.add(classes.hide);
         }
         else {
            discountWrapper.innerHTML = '';
            cartDiscountList.forEach(function(discountItem) {
               discountWrapper.appendChild(discountItem);
            });
            discountWrapper.classList.remove(classes.hide);
         }

         this.container.querySelector(selectors.cartSubtotal).innerHTML 
            = theme.Currency.formatMoney(state.total_price, theme.moneyFormatWithCurrency);
      },

      _createCartDiscountList: function(cart) {
         return cart.cart_level_discount_applications.map(
            function(discount) {
               var discountNode = this.cartDiscountTemplate.cloneNode(true);
               discountNode.querySelector(selectors.cartDiscountTitle).textContent = discount.title;
               discountNode.querySelector(selectors.cartDiscountAmount).innerHTML = theme.Currency.formatMoney(
                  discount.total_allocated_amount, theme.moneyFormat);
               return discountNode;
            }.bind(this)
         );
      },

      _createLineItemList: function(state) {
         return state.items.map(function(item, index) {
            var itemNode = this.itemTemplate.cloneNode(true);
            var itemPriceList = this.itemPriceListTemplate.cloneNode(true);

            this._setLineItemAttributes(itemNode, item, index);
            this._setLineItemImage(itemNode, item.featured_image);

            var cartItemTitle = itemNode.querySelector(selectors.cartItemTitle);
            cartItemTitle.textContent = item.product_title;
            cartItemTitle.setAttribute('href', item.url);

            var selling_plan_name = item.selling_plan_allocation
               ? item.selling_plan_allocation.selling_plan.name
               : null;

            var productDetailsList = this._createProductDetailsList(
               item.product_has_only_default_variant,
               item.options_with_values,
               item.properties,
               selling_plan_name
            );

            this._setProductDetailsList(itemNode, productDetailsList);
            this._setItemRemove(itemNode, item.title);
            itemPriceList.innerHTML = this._createItemPrice(item.original_price, item.final_price).outerHTML;

            if (item.unit_price_measurement) {
               itemPriceList.appendChild(this._createUnitPrice(item.unit_price, item.unit_price_measurement));
            }

            this._setItemPrice(itemNode, itemPriceList);

            var itemDiscountList = this._createItemDiscountList(item);
            this._setItemDiscountList(itemNode, itemDiscountList);
            this._setQuantityInputs(itemNode, item, index);

            var itemLinePrice = this._createItemPrice(item.original_line_price, item.final_line_price);
            this._setItemLinePrice(itemNode, itemLinePrice);
            return itemNode;
         }.bind(this));
      },

      _setLineItemAttributes: function(itemNode, item, index) {
         itemNode.setAttribute(attributes.cartItemKey, item.key);
         itemNode.setAttribute(attributes.cartItemUrl, item.url);
         itemNode.setAttribute(attributes.cartItemTitle, item.title);
         itemNode.setAttribute(attributes.cartItemIndex, index + 1);
         itemNode.setAttribute(attributes.cartItemQuantity, item.quantity);
      },

      _setLineItemImage: function(itemNode, featuredImage) {
         var image = itemNode.querySelector(selectors.cartItemImage);

         var sizedImageUrl =
         featuredImage.url !== null
            ? theme.Images.getSizedImageUrl(featuredImage.url, 'x190')
            : null;

         if (sizedImageUrl) {
         image.setAttribute('alt', featuredImage.alt);
         image.setAttribute('src', sizedImageUrl);
         image.classList.remove(classes.hide);
         } else {
         image.parentNode.removeChild(image);
         }
      },

      _setProductDetailsList: function(item, productDetailsList) {
         var itemDetails = item.querySelector(selectors.cartItemDetails);

         if (productDetailsList.length) {
         itemDetails.classList.remove(classes.hide);
         itemDetails.innerHTML = productDetailsList.reduce(function(
            result,
            element
         ) {
            return result + element.outerHTML;
         },
         '');

         return;
         }

         itemDetails.classList.add(classes.hide);
         itemDetails.textContent = '';
      },

      _setItemPrice: function(item, price) {
         item.querySelector(selectors.cartItemPrice).innerHTML = price.outerHTML;
      },

      _setItemDiscountList: function(item, discountList) {
         var itemDiscountList = item.querySelector(selectors.cartItemDiscountList);

         if (discountList.length === 0) {
         itemDiscountList.innerHTML = '';
         itemDiscountList.classList.add(classes.hide);
         } else {
         itemDiscountList.innerHTML = discountList.reduce(function(
            result,
            element
         ) {
            return result + element.outerHTML;
         },
         '');

         itemDiscountList.classList.remove(classes.hide);
         }
      },

      _setItemRemove: function(item, title) {
         item
         .querySelector(selectors.cartRemove)
         .setAttribute(
            'aria-label',
            theme.strings.removeLabel.replace('[product]', title)
         );
      },

      _setQuantityInputs: function(itemNode, item, index) {
         var mobileInput = itemNode.querySelector(selectors.quantityInputMobile);
         var desktopInput = itemNode.querySelector(selectors.quantityInputDesktop);

         mobileInput.setAttribute('id', 'updates_' + item.key);
         desktopInput.setAttribute('id', 'updates_large_' + item.key);

         [mobileInput, desktopInput].forEach(function(element) {
            element.setAttribute(attributes.quantityItem, index + 1);
            element.value = item.quantity;
         });

         itemNode.querySelector(selectors.quantityLabelMobile).setAttribute('for', 'updates_' + item.key);
         itemNode.querySelector(selectors.quantityLabelDesktop).setAttribute('for', 'updates_large_' + item.key);
      },

      setQuantityFormControllers: function() {
         var desktopQuantityInputs = document.querySelectorAll(selectors.quantityInputDesktop);
         var mobileQuantityInputs = document.querySelectorAll(selectors.quantityInputMobile);
         if (this.mql.matches) {
            addNameAttribute(desktopQuantityInputs);
            removeNameAttribute(mobileQuantityInputs);
         } else {
            addNameAttribute(mobileQuantityInputs);
            removeNameAttribute(desktopQuantityInputs);
         }

         function addNameAttribute(inputs) {
            inputs.forEach(function(element) {
               element.setAttribute('name', 'updates[]');
            });
         }

         function removeNameAttribute(inputs) {
            inputs.forEach(function(element) {
               element.removeAttribute('name');
            });
         }
      },

      _setItemLinePrice: function(item, price) {
         item.querySelector(selectors.cartItemLinePrice).innerHTML =
         price.outerHTML;
      },

      _createProductDetailsList: function(product_has_only_default_variant, options, properties, selling_plan_name) {
         var optionsPropertiesHTML = [];

         if (!product_has_only_default_variant) {
            optionsPropertiesHTML = optionsPropertiesHTML.concat(this._getOptionList(options));
         }

         if (selling_plan_name) {
            optionsPropertiesHTML = optionsPropertiesHTML.concat(this._getSellingPlanName(selling_plan_name));
         }

         if (properties !== null && Object.keys(properties).length !== 0) {
            optionsPropertiesHTML = optionsPropertiesHTML.concat(this._getPropertyList(properties));
         }

         return optionsPropertiesHTML;
      },

      _getOptionList: function(options) {
         return options.map(
            function(option) {
               var optionElement = this.itemOptionTemplate.cloneNode(true);
               optionElement.textContent = option.name + ': ' + option.value;
               optionElement.classList.remove(classes.hide);
               return optionElement;
            }.bind(this)
         );
      },

      _getPropertyList: function(properties) {
         var propertiesArray = properties !== null ? Object.entries(properties) : [];
         var filteredPropertiesArray = propertiesArray.filter(function(property) {
            // Line item properties prefixed with an underscore are not to be displayed
            // if the property value has a length of 0 (empty), don't display it
            if (property[0].charAt(0) === '_' || property[1].length === 0) {
               return false;
            } else {
               return true;
            }
         });

         return filteredPropertiesArray.map(function(property) {
            var propertyElement = this.itemPropertyTemplate.cloneNode(true);
            propertyElement.querySelector(selectors.cartItemPropertyName).textContent = property[0] + ': ';
            if (property[0].indexOf('/uploads/') === -1) {
               propertyElement.querySelector(selectors.cartItemPropertyValue).textContent = property[1];
            }
            else {
               propertyElement.querySelector(selectors.cartItemPropertyValue).innerHTML =
                  '<a href="' + property[1] + '"> ' +
                  property[1].split('/').pop() +
                  '</a>';
            }
            propertyElement.classList.remove(classes.hide);
            return propertyElement;
         }.bind(this));
      },

      _getSellingPlanName: function(selling_plan_name) {
         var sellingPlanNameElement = this.itemSellingPlanNameTemplate.cloneNode(true);
         sellingPlanNameElement.textContent = selling_plan_name;
         sellingPlanNameElement.classList.remove(classes.hide);
         return sellingPlanNameElement;
      },

      _createItemPrice: function(original_price, final_price) {
         var originalPriceHTML = theme.Currency.formatMoney(original_price, theme.moneyFormat);
         var resultHTML;

         if (original_price !== final_price) {
            resultHTML = this.itemPriceListTemplate.querySelector(selectors.cartItemDiscountedPriceGroup).cloneNode(true);
            resultHTML.querySelector(selectors.cartItemOriginalPrice).innerHTML = originalPriceHTML;
            resultHTML.querySelector(selectors.cartItemFinalPrice).innerHTML = theme.Currency.formatMoney(
               final_price,
               theme.moneyFormat
            );
         }
         else {
            resultHTML = this.itemPriceListTemplate.querySelector(selectors.cartItemRegularPriceGroup).cloneNode(true);
            resultHTML.querySelector(selectors.cartItemRegularPrice).innerHTML = originalPriceHTML;
         }
         resultHTML.classList.remove(classes.hide);
         return resultHTML;
      },

      _createUnitPrice: function(unitPrice, unitPriceMeasurement) {
         var unitPriceGroup = this.itemPriceListTemplate.querySelector(selectors.unitPriceGroup).cloneNode(true);
         var unitPriceBaseUnit = (unitPriceMeasurement.reference_value !== 1 ? unitPriceMeasurement.reference_value : '') + unitPriceMeasurement.reference_unit;
         unitPriceGroup.querySelector(selectors.unitPriceBaseUnit).textContent = unitPriceBaseUnit;
         unitPriceGroup.querySelector(selectors.unitPrice).innerHTML = theme.Currency.formatMoney(unitPrice, theme.moneyFormat);
         unitPriceGroup.classList.remove(classes.hide);
         return unitPriceGroup;
      },

      _createItemDiscountList: function(item) {
         return item.line_level_discount_allocations.map(function(discount) {
            var discountNode = this.itemDiscountTemplate.cloneNode(true);
            discountNode.querySelector(selectors.cartItemDiscountTitle).textContent = discount.discount_application.title;
            discountNode.querySelector(selectors.cartItemDiscountAmount).innerHTML = theme.Currency.formatMoney(discount.amount, theme.moneyFormat);
            return discountNode;
         }.bind(this));
      },

      _showQuantityErrorMessages: function(itemElement) {
         itemElement
         .querySelectorAll(selectors.cartQuantityErrorMessage)
         .forEach(function(element) {
            element.textContent = theme.strings.quantityMinimumMessage;
         });

         itemElement
         .querySelectorAll(selectors.cartQuantityErrorMessageWrapper)
         .forEach(function(element) {
            element.classList.remove(classes.hide);
         });

         itemElement
         .querySelectorAll(selectors.inputQty)
         .forEach(function(element) {
            element.classList.add(classes.inputError);
            element.focus();
         });
      },

      _hideQuantityErrorMessage: function() {
         var errorMessages = document.querySelectorAll(selectors.cartQuantityErrorMessageWrapper);
         errorMessages.forEach(function(element) {
            element.classList.add(classes.hide);
            element.querySelector(selectors.cartQuantityErrorMessage).textContent = '';
         });
         this.container.querySelectorAll(selectors.inputQty).forEach(function(element) {
            element.classList.remove(classes.inputError);
         });
      },

      _handleThumbnailClick: function(evt) {
         if (!evt.target.classList.contains(classes.thumbnails)) return;
         window.location.href = evt.target.closest(selectors.cartItem).getAttribute('data-cart-item-url');
      },

      _onNoteChange: function(evt) {
         if (!evt.target.hasAttribute('data-cart-notes')) return;
         var note = evt.target.value;
         this._hideCartError();
         this._hideQuantityErrorMessage();
         var headers = new Headers({ 'Content-Type': 'application/json' });
         var request = {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ note: note })
         };
         fetch('/cart/update.js', request).catch(function() {
            this._showCartError(evt.target);
         }.bind(this));
      },

      _showCartError: function(elementToFocus) {
         document.querySelector(selectors.cartErrorMessage).textContent = theme.strings.cartError;
         document.querySelector(selectors.cartErrorMessageWrapper).classList.remove(classes.hide);
         if (!elementToFocus) return;
         elementToFocus.focus();
      },

      _hideCartError: function() {
         document.querySelector(selectors.cartErrorMessageWrapper).classList.add(classes.hide);
         document.querySelector(selectors.cartErrorMessage).textContent = '';
      },

      _onRemoveItem: function(evt) {
         if (!evt.target.hasAttribute('data-cart-remove')) return;
         evt.preventDefault();
         var lineItem = evt.target.closest(selectors.cartItem);
         var index = Number(lineItem.getAttribute(attributes.cartItemIndex));
         this._hideCartError();
         var request = {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json;'
            },
            body: JSON.stringify({
               line: index,
               quantity: 0
            })
         };

         fetch('/cart/change.js', request)
            .then(function(response) {
               return response.json();
            })
            .then(function(state) {
               if (state.item_count === 0) {
                  this._emptyCart();
               }
               else {
                  this._createCart(state);
                  this._showRemoveMessage(lineItem.cloneNode(true));
               }
               this._setCartCountBubble(state.item_count);
            }.bind(this))
            .catch(function() {
               this._showCartError(null);
            }.bind(this));
      },

      _showRemoveMessage: function(lineItem) {
         var index = lineItem.getAttribute('data-cart-item-index');
         var removeMessage = this._getRemoveMessage(lineItem);

         if (index - 1 === 0) {
         this.container
            .querySelector('[data-cart-item-index="1"]')
            .insertAdjacentHTML('beforebegin', removeMessage.outerHTML);
         } else {
         this.container
            .querySelector("[data-cart-item-index='" + (index - 1) + "']")
            .insertAdjacentHTML('afterend', removeMessage.outerHTML);
         }

         this.container.querySelector('[data-removed-item-row]').focus();
      },

      _getRemoveMessage: function(lineItem) {
         var formattedMessage = this._formatRemoveMessage(lineItem);
         var tableCell = lineItem.querySelector(selectors.cartTableCell).cloneNode(true);
         tableCell.removeAttribute('class');
         tableCell.classList.add(classes.cartRemovedProduct);
         tableCell.setAttribute('colspan', '4');
         tableCell.innerHTML = formattedMessage;
         lineItem.setAttribute('role', 'alert');
         lineItem.setAttribute('tabindex', '-1');
         lineItem.setAttribute('data-removed-item-row', true);
         lineItem.innerHTML = tableCell.outerHTML;
         return lineItem;
      },

      _formatRemoveMessage: function(lineItem) {
         var quantity = lineItem.getAttribute('data-cart-item-quantity');
         var url = lineItem.getAttribute(attributes.cartItemUrl);
         var title = lineItem.getAttribute(attributes.cartItemTitle);
         return theme.strings.removedItemMessage
         .replace('[quantity]', quantity)
         .replace(
            '[link]',
            '<a ' +
               'href="' +
               url +
               '" class="text-link text-link--accent">' +
               title +
               '</a>'
         );
      },

      _setCartCountBubble: function(quantity) {
         this.cartCountBubble = this.cartCountBubble || document.querySelector(selectors.cartCountBubble);
         this.cartCount = this.cartCount || document.querySelector(selectors.cartCount);
         if (quantity > 0) {
            this.cartCountBubble.classList.remove(classes.hide);
            this.cartCount.textContent = quantity;
         } else {
            this.cartCountBubble.classList.add(classes.hide);
            this.cartCount.textContent = '';
         }
      },

      _emptyCart: function() {
         this.emptyPageContent = this.emptyPageContent || this.container.querySelector(selectors.emptyPageContent);
         this.cartWrapper = this.cartWrapper || this.container.querySelector(selectors.cartWrapper);
         this.emptyPageContent.classList.remove(classes.hide);
         this.cartWrapper.classList.add(classes.hide);
      }
   });
   return Cart;
})();


window.theme = window.theme || {};


theme.Filters = (function() {
  var settings = { mediaQueryMediumUp: '' };

  var selectors = {
    filterSelection: '#FilterTags',
    sortSelection: '#SortBy',
    selectInput: '[data-select-input]'
  };

  function Filters(container) {
    this.filterSelect = container.querySelector(selectors.filterSelection);
    this.sortSelect = container.querySelector(selectors.sortSelection);

    this.selects = document.querySelectorAll(selectors.selectInput);

    if (this.sortSelect) {
      this.defaultSort = this._getDefaultSortValue();
    }

    if (this.selects.length) {
      this.selects.forEach(function(select) {
        select.classList.remove('hidden');
      });
    }

    this.initBreakpoints = this._initBreakpoints.bind(this);

    this.mql = window.matchMedia(settings.mediaQueryMediumUp);
    this.mql.addListener(this.initBreakpoints);

    if (this.filterSelect) {
      this.filterSelect.addEventListener(
        'change',
        this._onFilterChange.bind(this)
      );
    }

    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', this._onSortChange.bind(this));
    }

    theme.Helpers.promiseStylesheet().then(
      function() {
        this._initBreakpoints();
      }.bind(this)
    );
    this._initParams();
  }

  Filters.prototype = Object.assign({}, Filters.prototype, {
    _initBreakpoints: function() {
      if (this.mql.matches) {
        slate.utils.resizeSelects(this.selects);
      }
    },

    _initParams: function() {
      this.queryParams = {};
      if (location.search.length) {
        var aKeyValue;
        var aCouples = location.search.substr(1).split('&');
        for (var i = 0; i < aCouples.length; i++) {
          aKeyValue = aCouples[i].split('=');
          if (aKeyValue.length > 1) {
            this.queryParams[
              decodeURIComponent(aKeyValue[0])
            ] = decodeURIComponent(aKeyValue[1]);
          }
        }
      }
    },

    _onSortChange: function() {
      this.queryParams.sort_by = this._getSortValue();

      if (this.queryParams.page) {
        delete this.queryParams.page;
      }

      window.location.search = decodeURIComponent(
        new URLSearchParams(Object.entries(this.queryParams)).toString()
      );
    },

    _onFilterChange: function() {
      document.location.href = this._getFilterValue();
    },

    _getFilterValue: function() {
      return this.filterSelect.value;
    },

    _getSortValue: function() {
      return this.sortSelect.value || this.defaultSort;
    },

    _getDefaultSortValue: function() {
      return this.sortSelect.dataset.defaultSortby;
    },

    onUnload: function() {
      if (this.filterSelect) {
        this.filterSelect.removeEventListener('change', this._onFilterChange);
      }

      if (this.sortSelect) {
        this.sortSelect.removeEventListener('change', this._onSortChange);
      }

      this.mql.removeListener(this.initBreakpoints);
    }
  });

  return Filters;
})();

window.theme = window.theme || {};


theme.Product = (function() {
   function Product(container) {
      this.container = container;
      var sectionId = container.getAttribute('data-section-id');
      this.zoomPictures = [];
      this.ajaxEnabled = container.getAttribute('data-ajax-enabled') === 'true';
      this.settings = {
         // Breakpoints from src/stylesheets/global/variables.scss.liquid
         mediaQueryMediumUp: 'screen and (min-width: 750px)',
         mediaQuerySmall: 'screen and (max-width: 749px)',
         bpSmall: false,
         enableHistoryState:
         container.getAttribute('data-enable-history-state') || false,
         namespace: '.slideshow-' + sectionId,
         sectionId: sectionId,
         sliderActive: false,
         zoomEnabled: false
      };

      this.selectors = {
         addToCart: '[data-add-to-cart]',
         addToCartText: '[data-add-to-cart-text]',
         cartCount: '[data-cart-count]',
         cartCountBubble: '[data-cart-count-bubble]',
         cartPopup: '[data-cart-popup]',
         cartPopupCartQuantity: '[data-cart-popup-cart-quantity]',
         cartPopupClose: '[data-cart-popup-close]',
         cartPopupDismiss: '[data-cart-popup-dismiss]',
         cartPopupImage: '[data-cart-popup-image]',
         cartPopupImageWrapper: '[data-cart-popup-image-wrapper]',
         cartPopupImagePlaceholder: '[data-image-loading-animation]',
         cartPopupProductDetails: '[data-cart-popup-product-details]',
         cartPopupQuantity: '[data-cart-popup-quantity]',
         cartPopupQuantityLabel: '[data-cart-popup-quantity-label]',
         cartPopupTitle: '[data-cart-popup-title]',
         cartPopupWrapper: '[data-cart-popup-wrapper]',
         loader: '[data-loader]',
         loaderStatus: '[data-loader-status]',
         quantity: '[data-quantity-input]',
         SKU: '.variant-sku',
         productStatus: '[data-product-status]',
         originalSelectorId: '#ProductSelect-' + sectionId,
         productForm: '[data-product-form]',
         errorMessage: '[data-error-message]',
         errorMessageWrapper: '[data-error-message-wrapper]',
         imageZoomWrapper: '[data-image-zoom-wrapper]',
         productMediaWrapper: '[data-product-single-media-wrapper]',
         productThumbImages: '.product-single__thumbnail--' + sectionId,
         productThumbs: '.product-single__thumbnails-' + sectionId,
         productThumbListItem: '.product-single__thumbnails-item',
         productThumbsWrapper: '.thumbnails-wrapper',
         saleLabel: '.product-price__sale-label-' + sectionId,
         singleOptionSelector: '.single-option-selector-' + sectionId,
         shopifyPaymentButton: '.shopify-payment-button',
         productMediaTypeVideo: '[data-product-media-type-video]',
         productMediaTypeModel: '[data-product-media-type-model]',
         priceContainer: '[data-price]',
         regularPrice: '[data-regular-price]',
         salePrice: '[data-sale-price]',
         unitPrice: '[data-unit-price]',
         unitPriceBaseUnit: '[data-unit-price-base-unit]',
         productPolicies: '[data-product-policies]',
         storeAvailabilityContainer: '[data-store-availability-container]'
      };

      this.classes = {
         cartPopupWrapperHidden: 'cart-popup-wrapper--hidden',
         hidden: 'hide',
         visibilityHidden: 'visibility-hidden',
         inputError: 'input--error',
         jsZoomEnabled: 'js-zoom-enabled',
         productOnSale: 'price--on-sale',
         productUnitAvailable: 'price--unit-available',
         productUnavailable: 'price--unavailable',
         productSoldOut: 'price--sold-out',
         cartImage: 'cart-popup-item__image',
         productFormErrorMessageWrapperHidden:
         'product-form__error-message-wrapper--hidden',
         activeClass: 'active-thumb',
         variantSoldOut: 'product-form--variant-sold-out'
      };

      this.eventHandlers = {};
      this.quantityInput = container.querySelector(this.selectors.quantity);
      this.errorMessageWrapper = container.querySelector(this.selectors.errorMessageWrapper);
      this.productForm = container.querySelector(this.selectors.productForm);
      this.addToCart = container.querySelector(this.selectors.addToCart);
      this.addToCartText = this.addToCart.querySelector(this.selectors.addToCartText);
      this.shopifyPaymentButton = container.querySelector(this.selectors.shopifyPaymentButton);
      this.productPolicies = container.querySelector(this.selectors.productPolicies);
      this.storeAvailabilityContainer = container.querySelector(this.selectors.storeAvailabilityContainer);
      this.loader = this.addToCart.querySelector(this.selectors.loader);
      this.loaderStatus = container.querySelector(this.selectors.loaderStatus);
      this.imageZoomWrapper = container.querySelectorAll(this.selectors.imageZoomWrapper);

      // Stop parsing if we don't have the product json script tag when loading section in the Theme Editor
      var productJson = document.getElementById('ProductJson-' + sectionId);
      if (!productJson || !productJson.innerHTML.length) { return; }
      this.productSingleObject = JSON.parse(productJson.innerHTML);

      // Initial state for global productState object
      this.productState = { available: true, soldOut: false, onSale: false, showUnitPrice: false };

      this._stringOverrides();
      this._initVariants();
      this._initMediaSwitch();
      this._initAddToCart();
      this._setActiveThumbnail();
      this._initProductVideo();
      this._initModelViewerLibraries();
      this._initShopifyXrLaunch();
   }

   Product.prototype = Object.assign({}, Product.prototype, {
      _stringOverrides: function() {
         theme.productStrings = theme.productStrings || {};
         theme.strings = Object.assign({}, theme.strings, theme.productStrings);
      },
      
      _initStoreAvailability: function() {
         this.storeAvailability = new theme.StoreAvailability(
            this.storeAvailabilityContainer
         );

         var storeAvailabilityModalOpenedCallback = function(event) {
            if (this.cartPopupWrapper && !this.cartPopupWrapper.classList.contains(this.classes.cartPopupWrapperHidden)) {
               this._hideCartPopup(event);
            }
         };

         // hide cart popup modal if the store availability modal is also opened
         this.storeAvailabilityContainer.addEventListener('storeAvailabilityModalOpened', storeAvailabilityModalOpenedCallback.bind(this));
      },

      _initVariants: function() {
         var options = {
            container: this.container,
            enableHistoryState: this.container.getAttribute('data-enable-history-state') || false,
            singleOptionSelector: this.selectors.singleOptionSelector,
            originalSelectorId: this.selectors.originalSelectorId,
            product: this.productSingleObject
         };
         this.variants = new slate.Variants(options);
         if (this.storeAvailability && this.variants.currentVariant.available) {
            this.storeAvailability.updateContent(this.variants.currentVariant.id);
         }
         this.eventHandlers.updateAvailability = this._updateAvailability.bind(this);
         this.eventHandlers.updateMedia = this._updateMedia.bind(this);
         this.eventHandlers.updatePrice = this._updatePrice.bind(this);
         this.eventHandlers.updateSKU = this._updateSKU.bind(this);
         this.container.addEventListener('variantChange', this.eventHandlers.updateAvailability);
         this.container.addEventListener('variantImageChange', this.eventHandlers.updateMedia);
         this.container.addEventListener('variantPriceChange', this.eventHandlers.updatePrice);
         this.container.addEventListener('variantSKUChange', this.eventHandlers.updateSKU);
      },

      _initMediaSwitch: function() {
         if (!document.querySelector(this.selectors.productThumbImages)) { return; }
         var self = this;
         var productThumbImages = document.querySelectorAll(this.selectors.productThumbImages);
         this.eventHandlers.handleMediaFocus = this._handleMediaFocus.bind(this);
         productThumbImages.forEach(function(el) {
            el.addEventListener('click', function(evt) {
               evt.preventDefault();
               var mediaId = el.getAttribute('data-thumbnail-id');
               self._switchMedia(mediaId);
               self._setActiveThumbnail(mediaId);
            });
            el.addEventListener('keyup', self.eventHandlers.handleMediaFocus);
         });
      },

      _initAddToCart: function() {
         this.productForm.addEventListener('submit', function(evt) {
            if (this.addToCart.getAttribute('aria-disabled') === 'true') {
               evt.preventDefault();
               return;
            }
            if (!this.ajaxEnabled) return;
            evt.preventDefault();
            this.previouslyFocusedElement = document.activeElement;
            var isInvalidQuantity = !!this.quantityInput && this.quantityInput.value <= 0;
            if (isInvalidQuantity) {
               this._showErrorMessage(theme.strings.quantityMinimumMessage);
               return;
            }
            
            if (!isInvalidQuantity && this.ajaxEnabled) {
               // disable the addToCart and dynamic checkout button while
               // request/cart popup is loading and handle loading state
               this._handleButtonLoadingState(true);
               this._addItemToCart(this.productForm);
               return;
            }
         }.bind(this));
      },

      _initProductVideo: function() {
         var sectionId = this.settings.sectionId;
         var productMediaTypeVideo = this.container.querySelectorAll(this.selectors.productMediaTypeVideo);
         productMediaTypeVideo.forEach(function(el) {
            theme.ProductVideo.init(el, sectionId);
         });
      },

      _initModelViewerLibraries: function() {
         var modelViewerElements = this.container.querySelectorAll(this.selectors.productMediaTypeModel);
         if (modelViewerElements.length < 1) return;
         theme.ProductModel.init(modelViewerElements, this.settings.sectionId);
      },

      _initShopifyXrLaunch: function() {
         this.eventHandlers.initShopifyXrLaunchHandler = this._initShopifyXrLaunchHandler.bind(this);
         document.addEventListener('shopify_xr_launch', this.eventHandlers.initShopifyXrLaunchHandler);
      },

      _initShopifyXrLaunchHandler: function() {
         var currentMedia = this.container.querySelector(
         this.selectors.productMediaWrapper + ':not(.' + self.classes.hidden + ')');
         currentMedia.dispatchEvent(new CustomEvent('xrLaunch', { bubbles: true, cancelable: true }));
      },

      _addItemToCart: function(form) {
         var self = this;
         fetch('/cart/add.js', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
               'Content-Type': 'application/x-www-form-urlencoded',
               'X-Requested-With': 'XMLHttpRequest'
            },
            body: theme.Helpers.serialize(form)
         })
         .then(function(response) {
            return response.json();
         })
         .then(function(json) {
            if (json.status && json.status !== 200) {
               var error = new Error(json.description);
               error.isFromServer = true;
               throw error;
            }
            self._hideErrorMessage();
            self._setupCartPopup(json);
         })
         .catch(function(error) {
            self.previouslyFocusedElement.focus();
            self._showErrorMessage(error.isFromServer && error.message.length ? error.message : theme.strings.cartError);
            self._handleButtonLoadingState(false);
            // eslint-disable-next-line no-console
            console.log(error);
         });
      },

      _handleButtonLoadingState: function(isLoading) {
         if (isLoading) {
         this.addToCart.setAttribute('aria-disabled', true);
         this.addToCartText.classList.add(this.classes.hidden);
         this.loader.classList.remove(this.classes.hidden);

         if (this.shopifyPaymentButton) {
            this.shopifyPaymentButton.setAttribute('disabled', true);
         }

         this.loaderStatus.setAttribute('aria-hidden', false);
         } else {
         this.addToCart.removeAttribute('aria-disabled');
         this.addToCartText.classList.remove(this.classes.hidden);
         this.loader.classList.add(this.classes.hidden);

         if (this.shopifyPaymentButton) {
            this.shopifyPaymentButton.removeAttribute('disabled');
         }

         this.loaderStatus.setAttribute('aria-hidden', true);
         }
      },

      _showErrorMessage: function(errorMessage) {
         var errorMessageContainer = this.container.querySelector(
         this.selectors.errorMessage
         );
         errorMessageContainer.innerHTML = errorMessage;

         if (this.quantityInput) {
         this.quantityInput.classList.add(this.classes.inputError);
         }

         this.errorMessageWrapper.classList.remove(
         this.classes.productFormErrorMessageWrapperHidden
         );
         this.errorMessageWrapper.setAttribute('aria-hidden', true);
         this.errorMessageWrapper.removeAttribute('aria-hidden');
      },

      _hideErrorMessage: function() {
         this.errorMessageWrapper.classList.add(this.classes.productFormErrorMessageWrapperHidden);
         if (this.quantityInput) { this.quantityInput.classList.remove(this.classes.inputError); }
      },

      _setupCartPopup: function(item) {
         this.cartPopup =
         this.cartPopup || document.querySelector(this.selectors.cartPopup);
         this.cartPopupWrapper =
         this.cartPopupWrapper ||
         document.querySelector(this.selectors.cartPopupWrapper);
         this.cartPopupTitle =
         this.cartPopupTitle ||
         document.querySelector(this.selectors.cartPopupTitle);
         this.cartPopupQuantity =
         this.cartPopupQuantity ||
         document.querySelector(this.selectors.cartPopupQuantity);
         this.cartPopupQuantityLabel =
         this.cartPopupQuantityLabel ||
         document.querySelector(this.selectors.cartPopupQuantityLabel);
         this.cartPopupClose =
         this.cartPopupClose ||
         document.querySelector(this.selectors.cartPopupClose);
         this.cartPopupDismiss =
         this.cartPopupDismiss ||
         document.querySelector(this.selectors.cartPopupDismiss);
         this.cartPopupImagePlaceholder =
         this.cartPopupImagePlaceholder ||
         document.querySelector(this.selectors.cartPopupImagePlaceholder);
         this._setupCartPopupEventListeners();
         this._updateCartPopupContent(item);
      },

      _updateCartPopupContent: function(item) {
         var self = this;
         var quantity = this.quantityInput ? this.quantityInput.value : 1;
         var selling_plan_name = item.selling_plan_allocation
            ? item.selling_plan_allocation.selling_plan.name
            : null;

         this.cartPopupTitle.textContent = item.product_title;
         this.cartPopupQuantity.textContent = quantity;
         this.cartPopupQuantityLabel.textContent = theme.strings.quantityLabel.replace('[count]', quantity);
         this._setCartPopupPlaceholder(item.featured_image.url);
         this._setCartPopupImage(item.featured_image.url, item.featured_image.alt);
         this._setCartPopupProductDetails(
            item.product_has_only_default_variant,
            item.options_with_values,
            item.properties,
            selling_plan_name
         );

         fetch('/cart.js', { credentials: 'same-origin' })
            .then(function(response) {
               return response.json();
            })
            .then(function(cart) {
               self._setCartQuantity(cart.item_count);
               self._setCartCountBubble(cart.item_count);
               self._showCartPopup();
            })
            .catch(function(error) {
               console.log(error);
            });
      },

      _setupCartPopupEventListeners: function() {
         this.eventHandlers.cartPopupWrapperKeyupHandler = this._cartPopupWrapperKeyupHandler.bind(this);
         this.eventHandlers.hideCartPopup = this._hideCartPopup.bind(this);
         this.eventHandlers.onBodyClick = this._onBodyClick.bind(this);
         this.cartPopupWrapper.addEventListener('keyup', this.eventHandlers.cartPopupWrapperKeyupHandler);
         this.cartPopupClose.addEventListener('click', this.eventHandlers.hideCartPopup);
         this.cartPopupDismiss.addEventListener('click', this.eventHandlers.hideCartPopup);
         document.body.addEventListener('click', this.eventHandlers.onBodyClick);
      },

      _cartPopupWrapperKeyupHandler: function(event) {
         if (event.keyCode === slate.utils.keyboardKeys.ESCAPE) {
            this._hideCartPopup(event);
         }
      },

      _setCartPopupPlaceholder: function(imageUrl) {
         this.cartPopupImageWrapper = this.cartPopupImageWrapper || document.querySelector(this.selectors.cartPopupImageWrapper);
         if (imageUrl === null) {
            this.cartPopupImageWrapper.classList.add(this.classes.hidden);
            return;
         }
      },

      _setCartPopupImage: function(imageUrl, imageAlt) {
         if (imageUrl === null) return;
         this.cartPopupImageWrapper.classList.remove(this.classes.hidden);
         var sizedImageUrl = theme.Images.getSizedImageUrl(imageUrl, '200x');
         var image = document.createElement('img');
         image.src = sizedImageUrl;
         image.alt = imageAlt;
         image.classList.add(this.classes.cartImage);
         image.setAttribute('data-cart-popup-image', '');
         image.onload = function() {
         this.cartPopupImagePlaceholder.removeAttribute('data-image-loading-animation');
         this.cartPopupImageWrapper.append(image);
         }.bind(this);
      },

      _setCartPopupProductDetails: function(product_has_only_default_variant, options, properties, selling_plan_name) {
         this.cartPopupProductDetails = this.cartPopupProductDetails || document.querySelector(this.selectors.cartPopupProductDetails);
         var variantPropertiesHTML = '';
         if (!product_has_only_default_variant) {
            variantPropertiesHTML = variantPropertiesHTML + this._getVariantOptionList(options);
         }
         if (selling_plan_name) {
            variantPropertiesHTML = variantPropertiesHTML + this._getSellingPlanHTML(selling_plan_name);
         }
         if (properties !== null && Object.keys(properties).length !== 0) {
            variantPropertiesHTML = variantPropertiesHTML + this._getPropertyList(properties);
         }
         if (variantPropertiesHTML.length === 0) {
            this.cartPopupProductDetails.innerHTML = '';
            this.cartPopupProductDetails.setAttribute('hidden', '');
         }
         else {
            this.cartPopupProductDetails.innerHTML = variantPropertiesHTML;
            this.cartPopupProductDetails.removeAttribute('hidden');
         }  
      },

      _getVariantOptionList: function(variantOptions) {
         var variantOptionListHTML = '';
         variantOptions.forEach(function(variantOption) {
            variantOptionListHTML = variantOptionListHTML +
            '<li class="product-details__item product-details__item--variant-option">' +
            variantOption.name + ': ' + variantOption.value + '</li>';
         });
         return variantOptionListHTML;
      },

      _getPropertyList: function(properties) {
         var propertyListHTML = '';
         var propertiesArray = Object.entries(properties);
         propertiesArray.forEach(function(property) {
            // Line item properties prefixed with an underscore are not to be displayed
            if (property[0].charAt(0) === '_') return;

            // if the property value has a length of 0 (empty), don't display it
            if (property[1].length === 0) return;

            propertyListHTML = propertyListHTML +
               '<li class="product-details__item product-details__item--property">' +
               '<span class="product-details__property-label">' +
               property[0] + ': </span>' + property[1] + ': ' + '</li>';
         });
         return propertyListHTML;
      },

      _getSellingPlanHTML: function(selling_plan_name) {
         var sellingPlanHTML = '<li class="product-details__item product-details__item--property">' + selling_plan_name + '</li>';
         return sellingPlanHTML;
      },

      _setCartQuantity: function(quantity) {
         this.cartPopupCartQuantity = this.cartPopupCartQuantity || document.querySelector(this.selectors.cartPopupCartQuantity);
         var ariaLabel;
         if (quantity === 1) {
            ariaLabel = theme.strings.oneCartCount;
         } else if (quantity > 1) {
            ariaLabel = theme.strings.otherCartCount.replace('[count]', quantity);
         }
         this.cartPopupCartQuantity.textContent = quantity;
         this.cartPopupCartQuantity.setAttribute('aria-label', ariaLabel);
      },
      
      _setCartCountBubble: function(quantity) {
         this.cartCountBubble = this.cartCountBubble || document.querySelector(this.selectors.cartCountBubble);
         this.cartCount = this.cartCount || document.querySelector(this.selectors.cartCount);
         this.cartCountBubble.classList.remove(this.classes.hidden);
         this.cartCount.textContent = quantity;
      },

    _showCartPopup: function() {
      theme.Helpers.prepareTransition(this.cartPopupWrapper);

      this.cartPopupWrapper.classList.remove(
        this.classes.cartPopupWrapperHidden
      );
      this._handleButtonLoadingState(false);

      slate.a11y.trapFocus({
        container: this.cartPopupWrapper,
        elementToFocus: this.cartPopup,
        namespace: 'cartPopupFocus'
      });
    },

    _hideCartPopup: function(event) {
      var setFocus = event.detail === 0 ? true : false;
      theme.Helpers.prepareTransition(this.cartPopupWrapper);
      this.cartPopupWrapper.classList.add(this.classes.cartPopupWrapperHidden);

      var cartPopupImage = document.querySelector(
        this.selectors.cartPopupImage
      );
      if (cartPopupImage) {
        cartPopupImage.remove();
      }
      this.cartPopupImagePlaceholder.setAttribute(
        'data-image-loading-animation',
        ''
      );

      slate.a11y.removeTrapFocus({
        container: this.cartPopupWrapper,
        namespace: 'cartPopupFocus'
      });

      if (setFocus) this.previouslyFocusedElement.focus();

      this.cartPopupWrapper.removeEventListener(
        'keyup',
        this.eventHandlers.cartPopupWrapperKeyupHandler
      );
      this.cartPopupClose.removeEventListener(
        'click',
        this.eventHandlers.hideCartPopup
      );
      this.cartPopupDismiss.removeEventListener(
        'click',
        this.eventHandlers.hideCartPopup
      );
      document.body.removeEventListener(
        'click',
        this.eventHandlers.onBodyClick
      );
    },

    _onBodyClick: function(event) {
      var target = event.target;

      if (
        target !== this.cartPopupWrapper &&
        !target.closest(this.selectors.cartPopup)
      ) {
        this._hideCartPopup(event);
      }
    },

    _setActiveThumbnail: function(mediaId) {
      // If there is no element passed, find it by the current product image
      if (typeof mediaId === 'undefined') {
        var productMediaWrapper = this.container.querySelector(
          this.selectors.productMediaWrapper + ':not(.hide)'
        );

        if (!productMediaWrapper) return;
        mediaId = productMediaWrapper.getAttribute('data-media-id');
      }

      var thumbnailWrappers = this.container.querySelectorAll(
        this.selectors.productThumbListItem + ':not(.slick-cloned)'
      );

      var activeThumbnail;
      thumbnailWrappers.forEach(
        function(el) {
          var current = el.querySelector(
            this.selectors.productThumbImages +
              "[data-thumbnail-id='" +
              mediaId +
              "']"
          );
          if (current) {
            activeThumbnail = current;
          }
        }.bind(this)
      );

      var productThumbImages = document.querySelectorAll(
        this.selectors.productThumbImages
      );
      productThumbImages.forEach(
        function(el) {
          el.classList.remove(this.classes.activeClass);
          el.removeAttribute('aria-current');
        }.bind(this)
      );

      if (activeThumbnail) {
        activeThumbnail.classList.add(this.classes.activeClass);
        activeThumbnail.setAttribute('aria-current', true);
        this._adjustThumbnailSlider(activeThumbnail);
      }
    },

    _adjustThumbnailSlider: function(activeThumbnail) {
      var sliderItem = activeThumbnail.closest('[data-slider-item]');
      if (!sliderItem) return;

      var slideGroupLeaderIndex =
        Math.floor(
          Number(sliderItem.getAttribute('data-slider-slide-index')) / 3
        ) * 3;

      window.setTimeout(
        function() {
          if (!this.slideshow) return;
          this.slideshow.goToSlideByIndex(slideGroupLeaderIndex);
        }.bind(this),
        251
      );
    },

    _switchMedia: function(mediaId) {
      var currentMedia = this.container.querySelector(
        this.selectors.productMediaWrapper +
          ':not(.' +
          this.classes.hidden +
          ')'
      );

      var newMedia = this.container.querySelector(
        this.selectors.productMediaWrapper + "[data-media-id='" + mediaId + "']"
      );

      var otherMedia = this.container.querySelectorAll(
        this.selectors.productMediaWrapper +
          ":not([data-media-id='" +
          mediaId +
          "'])"
      );

      currentMedia.dispatchEvent(
        new CustomEvent('mediaHidden', {
          bubbles: true,
          cancelable: true
        })
      );
      newMedia.classList.remove(this.classes.hidden);
      newMedia.dispatchEvent(
        new CustomEvent('mediaVisible', {
          bubbles: true,
          cancelable: true
        })
      );
      otherMedia.forEach(
        function(el) {
          el.classList.add(this.classes.hidden);
        }.bind(this)
      );
    },

    _handleMediaFocus: function(evt) {
      if (evt.keyCode !== slate.utils.keyboardKeys.ENTER) return;

      var mediaId = evt.currentTarget.getAttribute('data-thumbnail-id');

      var productMediaWrapper = this.container.querySelector(
        this.selectors.productMediaWrapper + "[data-media-id='" + mediaId + "']"
      );
      productMediaWrapper.focus();
    },

    _initThumbnailSlider: function() {
      setTimeout(
        function() {
          this.slideshow = new theme.Slideshow(
            this.container.querySelector('[data-thumbnail-slider]'),
            {
              canUseTouchEvents: true,
              type: 'slide',
              slideActiveClass: 'slick-active',
              slidesToShow: 3,
              slidesToScroll: 3
            }
          );

          this.settings.sliderActive = true;
        }.bind(this),
        250
      );
    },

    _destroyThumbnailSlider: function() {
      var sliderButtons = this.container.querySelectorAll(
        '[data-slider-button]'
      );
      var sliderTrack = this.container.querySelector('[data-slider-track]');
      var sliderItems = sliderTrack.querySelectorAll('[data-slider-item');
      this.settings.sliderActive = false;

      if (sliderTrack) {
        sliderTrack.removeAttribute('style');
        sliderItems.forEach(function(sliderItem) {
          var sliderItemLink = sliderItem.querySelector(
            '[data-slider-item-link]'
          );
          sliderItem.classList.remove('slick-active');
          sliderItem.removeAttribute('style');
          sliderItem.removeAttribute('tabindex');
          sliderItem.removeAttribute('aria-hidden');
          sliderItemLink.removeAttribute('tabindex');
        });
      }

      sliderButtons.forEach(function(sliderButton) {
        sliderButton.removeAttribute('aria-disabled');
      });

      this.slideshow.destroy();
      this.slideshow = null;
    },

    _liveRegionText: function(variant) {
      // Dummy content for live region
      var liveRegionText =
        '[Availability] [Regular] [$$] [Sale] [$]. [UnitPrice] [$$$]';

      if (!this.productState.available) {
        liveRegionText = theme.strings.unavailable;
        return liveRegionText;
      }

      // Update availability
      var availability = this.productState.soldOut
        ? theme.strings.soldOut + ','
        : '';
      liveRegionText = liveRegionText.replace('[Availability]', availability);

      // Update pricing information
      var regularLabel = '';
      var regularPrice = theme.Currency.formatMoney(
        variant.price,
        theme.moneyFormat
      );
      var saleLabel = '';
      var salePrice = '';
      var unitLabel = '';
      var unitPrice = '';

      if (this.productState.onSale) {
        regularLabel = theme.strings.regularPrice;
        regularPrice =
          theme.Currency.formatMoney(
            variant.compare_at_price,
            theme.moneyFormat
          ) + ',';
        saleLabel = theme.strings.sale;
        salePrice = theme.Currency.formatMoney(
          variant.price,
          theme.moneyFormat
        );
      }

      if (this.productState.showUnitPrice) {
        unitLabel = theme.strings.unitPrice;
        unitPrice =
          theme.Currency.formatMoney(variant.unit_price, theme.moneyFormat) +
          ' ' +
          theme.strings.unitPriceSeparator +
          ' ' +
          this._getBaseUnit(variant);
      }

      liveRegionText = liveRegionText
        .replace('[Regular]', regularLabel)
        .replace('[$$]', regularPrice)
        .replace('[Sale]', saleLabel)
        .replace('[$]', salePrice)
        .replace('[UnitPrice]', unitLabel)
        .replace('[$$$]', unitPrice)
        .trim();

      return liveRegionText;
    },

    _updateLiveRegion: function(evt) {
      var variant = evt.detail.variant;
      var liveRegion = this.container.querySelector(
        this.selectors.productStatus
      );
      liveRegion.innerHTML = this._liveRegionText(variant);
      liveRegion.setAttribute('aria-hidden', false);
      // hide content from accessibility tree after announcement
      setTimeout(function() {
        liveRegion.setAttribute('aria-hidden', true);
      }, 1000);
    },

    _enableAddToCart: function(message) {
      this.addToCart.removeAttribute('aria-disabled');
      this.addToCart.setAttribute('aria-label', message);
      this.addToCartText.innerHTML = message;
      this.productForm.classList.remove(this.classes.variantSoldOut);
    },

    _disableAddToCart: function(message) {
      message = message || theme.strings.unavailable;
      this.addToCart.setAttribute('aria-disabled', true);
      this.addToCart.setAttribute('aria-label', message);
      this.addToCartText.innerHTML = message;
      this.productForm.classList.add(this.classes.variantSoldOut);
    },

    _updateAddToCart: function() {
      if (!this.productState.available) {
        this._disableAddToCart(theme.strings.unavailable);
        return;
      }
      if (this.productState.soldOut) {
        this._disableAddToCart(theme.strings.soldOut);
        return;
      }

      this._enableAddToCart(theme.strings.addToCart);
    },

    /**
     * The returned productState object keeps track of a number of properties about the current variant and product
     * Multiple functions within product.js leverage the productState object to determine how to update the page's UI
     * @param {object} evt - object returned from variant change event
     * @return {object} productState - current product variant's state
     *                  productState.available - true if current product options result in valid variant
     *                  productState.soldOut - true if variant is sold out
     *                  productState.onSale - true if variant is on sale
     *                  productState.showUnitPrice - true if variant has unit price value
     */
    _setProductState: function(evt) {
      var variant = evt.detail.variant;

      if (!variant) {
        this.productState.available = false;
        return;
      }

      this.productState.available = true;
      this.productState.soldOut = !variant.available;
      this.productState.onSale = variant.compare_at_price > variant.price;
      this.productState.showUnitPrice = !!variant.unit_price;
    },

    _updateAvailability: function(evt) {
      // remove error message if one is showing
      this._hideErrorMessage();

      // set product state
      this._setProductState(evt);

      // update store availabilities info
      this._updateStoreAvailabilityContent(evt);
      // update form submit
      this._updateAddToCart();
      // update live region
      this._updateLiveRegion(evt);

      this._updatePrice(evt);
    },

    _updateStoreAvailabilityContent: function(evt) {
      if (!this.storeAvailability) {
        return;
      }

      if (this.productState.available && !this.productState.soldOut) {
        this.storeAvailability.updateContent(evt.detail.variant.id);
      } else {
        this.storeAvailability.clearContent();
      }
    },

    _updateMedia: function(evt) {
      var variant = evt.detail.variant;
      var mediaId = variant.featured_media.id;
      var sectionMediaId = this.settings.sectionId + '-' + mediaId;

      this._switchMedia(sectionMediaId);
      this._setActiveThumbnail(sectionMediaId);
    },

    _updatePrice: function(evt) {
      var variant = evt.detail.variant;

      var priceContainer = this.container.querySelector(
        this.selectors.priceContainer
      );
      var regularPrices = priceContainer.querySelectorAll(
        this.selectors.regularPrice
      );
      var salePrice = priceContainer.querySelector(this.selectors.salePrice);
      var unitPrice = priceContainer.querySelector(this.selectors.unitPrice);
      var unitPriceBaseUnit = priceContainer.querySelector(
        this.selectors.unitPriceBaseUnit
      );

      var formatRegularPrice = function(regularPriceElement, price) {
        regularPriceElement.innerHTML = theme.Currency.formatMoney(
          price,
          theme.moneyFormat
        );
      };

      // Reset product price state

      priceContainer.classList.remove(
        this.classes.productUnavailable,
        this.classes.productOnSale,
        this.classes.productUnitAvailable,
        this.classes.productSoldOut
      );
      priceContainer.removeAttribute('aria-hidden');

      if (this.productPolicies) {
        this.productPolicies.classList.remove(this.classes.visibilityHidden);
      }

      // Unavailable
      if (!this.productState.available) {
        priceContainer.classList.add(this.classes.productUnavailable);
        priceContainer.setAttribute('aria-hidden', true);

        if (this.productPolicies) {
          this.productPolicies.classList.add(this.classes.visibilityHidden);
        }
        return;
      }

      // Sold out
      if (this.productState.soldOut) {
        priceContainer.classList.add(this.classes.productSoldOut);
      }

      // On sale
      if (this.productState.onSale) {
        regularPrices.forEach(function(regularPrice) {
          formatRegularPrice(regularPrice, variant.compare_at_price);
        });

        salePrice.innerHTML = theme.Currency.formatMoney(
          variant.price,
          theme.moneyFormat
        );
        priceContainer.classList.add(this.classes.productOnSale);
      } else {
        // Regular price
        regularPrices.forEach(function(regularPrice) {
          formatRegularPrice(regularPrice, variant.price);
        });
      }

      // Unit price
      if (this.productState.showUnitPrice) {
        unitPrice.innerHTML = theme.Currency.formatMoney(
          variant.unit_price,
          theme.moneyFormat
        );
        unitPriceBaseUnit.innerHTML = this._getBaseUnit(variant);
        priceContainer.classList.add(this.classes.productUnitAvailable);
      }
    },

    _getBaseUnit: function(variant) {
      return variant.unit_price_measurement.reference_value === 1
        ? variant.unit_price_measurement.reference_unit
        : variant.unit_price_measurement.reference_value +
            variant.unit_price_measurement.reference_unit;
    },

    _updateSKU: function(evt) {
      var variant = evt.detail.variant;

      // Update the sku
      var sku = document.querySelector(this.selectors.SKU);
      if (!sku) return;
      sku.innerHTML = variant.sku;
    },

    _enableZoom: function(el, index) {
      this.zoomPictures[index] = new theme.Zoom(el);
    },

    _destroyZoom: function(index) {
      if (this.zoomPictures.length === 0) return;
      this.zoomPictures[index].unload();
    },

    onUnload: function() {
      this.container.removeEventListener(
        'variantChange',
        this.eventHandlers.updateAvailability
      );
      this.container.removeEventListener(
        'variantImageChange',
        this.eventHandlers.updateMedia
      );
      this.container.removeEventListener(
        'variantPriceChange',
        this.eventHandlers.updatePrice
      );
      this.container.removeEventListener(
        'variantSKUChange',
        this.eventHandlers.updateSKU
      );
      theme.ProductVideo.removeSectionVideos(this.settings.sectionId);
      theme.ProductModel.removeSectionModels(this.settings.sectionId);

      if (this.mqlSmall) {
        this.mqlSmall.removeListener(this.initMobileBreakpoint);
      }

      if (this.mqlMediumUp) {
        this.mqlMediumUp.removeListener(this.initDesktopBreakpoint);
      }
    }
  });

  return Product;
})();

window.theme = window.theme || {};


document.addEventListener('DOMContentLoaded', function() {
   var sections = new theme.Sections();
   sections.register('cart-template', theme.Cart);
   sections.register('product', theme.Product);
   sections.register('collection-template', theme.Filters);
   sections.register('product-template', theme.Product);
   //theme.customerTemplates.init();

   document.querySelectorAll('a[href="#"]').forEach(function(anchor) {
      anchor.addEventListener('click', function(evt) {
         evt.preventDefault();
      });
   });
});