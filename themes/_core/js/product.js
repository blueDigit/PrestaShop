/**
 * Copyright since 2007 PrestaShop SA and Contributors
 * PrestaShop is an International Registered Trademark & Property of PrestaShop SA
 *
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Open Software License (OSL 3.0)
 * that is bundled with this package in the file LICENSE.md.
 * It is also available through the world-wide-web at this URL:
 * https://opensource.org/licenses/OSL-3.0
 * If you did not receive a copy of the license and are unable to
 * obtain it through the world-wide-web, please send an email
 * to license@prestashop.com so we can send you a copy immediately.
 *
 * DISCLAIMER
 *
 * Do not edit or add to this file if you wish to upgrade PrestaShop to newer
 * versions in the future. If you wish to customize PrestaShop for your
 * needs please refer to https://devdocs.prestashop.com/ for more information.
 *
 * @author    PrestaShop SA and Contributors <contact@prestashop.com>
 * @copyright Since 2007 PrestaShop SA and Contributors
 * @license   https://opensource.org/licenses/OSL-3.0 Open Software License (OSL 3.0)
 */
import $ from 'jquery';
import prestashop from 'prestashop';
import {psGetRequestParameter} from './common';

// Check for popState event
let isOnPopStateEvent = false;

// Register form of first update
const firstFormData = [];

// Detect if the form has changed one time
let formChanged = false;

/**
 * Get product update URL from different
 * sources if needed (for compatibility)
 *
 * @return {Promise}
 */
function getProductUpdateUrl(event, eventType, context) {
  const dfd = $.Deferred();
  const $productActions = $(prestashop.selectors.product.actions, context);
  const $quantityWantedInput = $productActions.find(prestashop.selectors.quantityWanted);

  if (
    prestashop !== null
    && prestashop.urls !== null
    && prestashop.urls.pages !== null
    && prestashop.urls.pages.product !== ''
    && prestashop.urls.pages.product !== null
  ) {
    dfd.resolve(prestashop.urls.pages.product);

    return dfd.promise();
  }
  const formData = {};

  $($productActions.find('form:first').serializeArray()).each((k, v) => {
    formData[v.name] = v.value;
  });

  prestashop.emit('updateProduct.begin', {event, eventType, context});

  $.ajax({
    url: $productActions.find('form:first').attr('action'),
    method: 'POST',
    data: {
      ajax: 1,
      action: 'productrefresh',
      quantity_wanted: $quantityWantedInput.val(),
      ...formData,
    },
    dataType: 'json',
    success(data) {
      const productUpdateUrl = data.productUrl;
      prestashop.page.canonical = productUpdateUrl;
      dfd.resolve(productUpdateUrl);
    },
    error(jqXHR, textStatus, errorThrown) {
      dfd.reject({
        jqXHR,
        textStatus,
        errorThrown,
      });
    },
    complete() {
      prestashop.emit('updateProduct.end', {event, eventType, context});
    },
  });

  return dfd.promise();
}

/**
 * @param {string} errorMessage
 */
function showErrorNextToAddtoCartButton(context, errorMessage) {
  showError(
    $('#product-availability, .product-availability', context),
    errorMessage,
  );
}

/**
 * Update the product html
 *
 * @param {string} event
 * @param {string} eventType
 * @param {string} updateUrl
 */
function updateProduct(event, eventType, context, updateUrl) {
  const $productActions = $(prestashop.selectors.product.actions, context);
  const $quantityWantedInput = $productActions.find(
    prestashop.selectors.quantityWanted,
  );
  const $form = $productActions.find('form:first');
  const formSerialized = $form.serialize();

  if ($(context).data('currentRequest') === undefined) {
    $(context).data('currentRequest', {
      request: null,
      delayId: null,
    });
  }

  const currentRequest = $(context).data('currentRequest');

  let preview = psGetRequestParameter('preview');
  let updateRatingEvent;

  if (typeof Event === 'function') {
    updateRatingEvent = new Event('updateRating');
  } else {
    updateRatingEvent = document.createEvent('Event');
    updateRatingEvent.initEvent('updateRating', true, true);
  }

  if (preview !== null) {
    preview = `&preview=${preview}`;
  } else {
    preview = '';
  }

  // Can not get product ajax url
  if (updateUrl === null) {
    showErrorNextToAddtoCartButton(context);

    return;
  }

  // New request only if new value
  if (
    event
    && event.type === 'keyup'
    && $quantityWantedInput.val() === $quantityWantedInput.data('old-value')
  ) {
    return;
  }
  $quantityWantedInput.data('old-value', $quantityWantedInput.val());

  if (currentRequest.delayId) {
    clearTimeout(currentRequest.delayId);
    prestashop.emit('updateProduct.end', {event, eventType, context});
  }

  // Most update need to occur (almost) instantly, but in some cases (like keyboard actions)
  // we need to delay the update a bit more
  let updateDelay = 30;

  if (eventType === 'updatedProductQuantity') {
    updateDelay = 750;
  }

  prestashop.emit('updateProduct.begin', {event, eventType, context});

  currentRequest.delayId = setTimeout(() => {
    if (formSerialized === '') {
      prestashop.emit('updateProduct.end', {event, eventType, context});

      return;
    }

    currentRequest.request = $.ajax({
      url:
        updateUrl
        + (updateUrl.indexOf('?') === -1 ? '?' : '&')
        + formSerialized
        + preview,
      method: 'POST',
      data: {
        quickview: $(context).is(prestashop.selectors.product.quickviewContext) ? 1 : 0,
        product_layout: $(context).attr('data-product-layout') || '',
        unique_id: $(context).attr('data-unique-id') || '',
        ajax: 1,
        action: 'refresh',
        quantity_wanted:
          eventType === 'updatedProductCombination'
            ? $quantityWantedInput.attr('min')
            : $quantityWantedInput.val(),
      },
      dataType: 'json',
      beforeSend() {
        if (currentRequest.request !== null) {
          currentRequest.request.abort();
          prestashop.emit('updateProduct.end', {event, eventType, context});
        }
      },
      error(jqXHR, textStatus) {
        if (
          textStatus !== 'abort'
          && $('section#main > .ajax-error').length === 0
        ) {
          showErrorNextToAddtoCartButton(context);
        }
      },
      success(data) {
        // Avoid image to blink each time we modify the product quantity
        // Can not compare directly cause of HTML comments in data.
        const $newImagesContainer = $('<div>').append(
          data.product_cover_thumbnails,
        );

        // Used to avoid image blinking if same image = epileptic friendly
        if (
          $(prestashop.selectors.product.imageContainer, context).html()
          !== $newImagesContainer
            .find(prestashop.selectors.product.imageContainer)
            .html()
        ) {
          $(prestashop.selectors.product.imageContainer, context).replaceWith(
            data.product_cover_thumbnails,
          );
        }
        $(prestashop.selectors.product.prices, context)
          .first()
          .replaceWith(data.product_prices);
        $(prestashop.selectors.product.customization, context)
          .first()
          .replaceWith(data.product_customization);

        // refill customizationId input value when updating quantity or combination
        if (
          (eventType === 'updatedProductQuantity' || eventType === 'updatedProductCombination')
          && data.id_customization
        ) {
          $(prestashop.selectors.cart.productCustomizationId, context)
            .val(data.id_customization);
        } else {
          $(prestashop.selectors.product.inputCustomization, context).val(0);
        }

        $(prestashop.selectors.product.variantsUpdate, context)
          .first()
          .replaceWith(data.product_variants);
        $(prestashop.selectors.product.discounts, context)
          .first()
          .replaceWith(data.product_discounts);
        $(prestashop.selectors.product.additionalInfos, context)
          .first()
          .replaceWith(data.product_additional_info);
        $(prestashop.selectors.product.details, context).replaceWith(
          data.product_details,
        );
        $(prestashop.selectors.product.flags, context)
          .first()
          .replaceWith(data.product_flags);
        replaceAddToCartSections(data, context);
        const minimalProductQuantity = parseInt(
          data.product_minimal_quantity,
          10,
        );

        document.dispatchEvent(updateRatingEvent);

        // Prevent quantity input from blinking with classic theme.
        if (
          !isNaN(minimalProductQuantity)
          && eventType !== 'updatedProductQuantity'
        ) {
          $quantityWantedInput.attr('min', minimalProductQuantity);
          $quantityWantedInput.val(minimalProductQuantity);
        }
        prestashop.emit('updatedProduct', data, $form.serializeArray(), context);
      },
      complete() {
        currentRequest.request = null;
        currentRequest.delayId = null;
        prestashop.emit('updateProduct.end', {event, eventType, context});
      },
    });
  }, updateDelay);
}

/**
 * Replace all "add to cart" sections but the quantity input
 * in order to keep quantity field intact i.e.
 *
 * @param {object} data of updated product and cat
 */
function replaceAddToCartSections(data, context) {
  const $productAddToCart = $('<div>').html(data.product_add_to_cart).find('.product-add-to-cart');

  if (!$productAddToCart.length) {
    showErrorNextToAddtoCartButton(context);
  }

  const $addProductToCart = $(prestashop.selectors.product.addToCart, context);
  const productAvailabilitySelector = '.add';
  const productAvailabilityMessageSelector = '#product-availability, .product-availability';
  const productMinimalQuantitySelector = '.product-minimal-quantity';

  replaceAddToCartSection({
    $addToCartSnippet: $productAddToCart,
    $targetParent: $addProductToCart,
    targetSelector: productAvailabilitySelector,
  });

  replaceAddToCartSection({
    $addToCartSnippet: $productAddToCart,
    $targetParent: $addProductToCart,
    targetSelector: productAvailabilityMessageSelector,
  });

  replaceAddToCartSection({
    $addToCartSnippet: $productAddToCart,
    $targetParent: $addProductToCart,
    targetSelector: productMinimalQuantitySelector,
  });
}

/**
 * Find DOM elements and replace their content
 *
 * @param {object} replacement Data to be replaced on the current page
 */
function replaceAddToCartSection(replacement) {
  const destinationObject = $(
    replacement.$targetParent.find(replacement.targetSelector),
  );

  if (destinationObject.length <= 0) {
    return;
  }
  const replace = replacement.$addToCartSnippet.find(
    replacement.targetSelector,
  );

  if (replace.length > 0) {
    destinationObject.replaceWith(replace[0].outerHTML);
  } else {
    destinationObject.html('');
  }
}

/**
 * Find context DOM element
 *
 * @param {object} element
 */
function findContext(element) {
  let $context;

  if (element) {
    $context = $(element).closest(prestashop.selectors.product.context);
  }

  if (!$context || $context.length === 0) {
    $context = $(
      '.quickview, .page-product:not(.modal-open) .product-container',
    );
  }

  return $context.length > 0 ? $context[0] : null;
}

/**
 * @param {jQuery} $container
 * @param {string} textError
 */
function showError($container, textError) {
  const $error = $(
    `<div class="alert alert-danger ajax-error" role="alert">${textError}</div>`,
  );
  $container.replaceWith($error);
}

$(document).ready(() => {
  const $form = $(prestashop.selectors.product.actions).find('form:first');
  const productContext = findContext($form);

  // Listen on all form elements + those who have a data-product-attribute
  $('body').on(
    'change touchspin.on.startspin',
    `${prestashop.selectors.product.variants} *[name]`,
    (e) => {
      formChanged = true;

      prestashop.emit('updateProduct', {
        eventType: 'updatedProductCombination',
        event: e,
        // Following variables are not used anymore, but kept for backward compatibility
        resp: {},
        reason: {
          productUrl: prestashop.urls.pages.product || '',
        },
      });
    },
  );

  // Stocking first form information
  $($form.serializeArray()).each(
    (k, {value, name}) => {
      firstFormData.push({value, name});
    },
  );

  window.addEventListener('popstate', (event) => {
    isOnPopStateEvent = true;

    if (
      (!event.state
        || (event.state && event.state.form && event.state.form.length === 0))
      && !formChanged
    ) {
      return;
    }

    if (event.state && event.state.form) {
      event.state.form.forEach((pair) => {
        $form.find(`[name="${pair.name}"]`).val(pair.value);
      });
    } else {
      firstFormData.forEach((pair) => {
        $form.find(`[name="${pair.name}"]`).val(pair.value);
      });
    }

    prestashop.emit('updateProduct', {
      eventType: 'updatedProductCombination',
      event,
      productContext,
      // Following variables are not used anymore, but kept for backward compatibility
      resp: {},
      reason: {
        productUrl: prestashop.urls.pages.product || '',
      },
    });
  });

  /**
   * Button has been removed on classic theme, but event triggering has been kept for compatibility
   */
  $('body').on(
    'click',
    prestashop.selectors.product.refresh,
    (e, extraParameters) => {
      e.preventDefault();
      let eventType = 'updatedProductCombination';

      if (typeof extraParameters !== 'undefined' && extraParameters.eventType) {
        // eslint-disable-next-line
        eventType = extraParameters.eventType;
      }

      prestashop.emit('updateProduct', {
        eventType,
        event: e,
        // Following variables are not used anymore, but kept for backward compatibility
        resp: {},
        reason: {
          productUrl: prestashop.urls.pages.product || '',
        },
      });
    },
  );

  // Refresh all the product content
  prestashop.on('updateProduct', (args) => {
    const {eventType} = args;
    const {event} = args;
    const context = args.context
      ? args.context
      : findContext(event ? event.target : null);

    const $context = (eventType !== undefined || !$(context).data('idProduct'))
      ? $(context)
      : $(prestashop.selectors.product.actions).closest(
        prestashop.selectors.product.context,
      ).filter(
        (index, element) => $(element).data('idProduct') === $(context).data('idProduct'),
      );

    if ($context.length === 0) {
      return;
    }

    getProductUpdateUrl(event, eventType, context).done(
      (productUpdateUrl) => {
        $context.each(
          (index, element) => {
            updateProduct(event, eventType, element, productUpdateUrl);
          },
        );
      },
    ).fail(() => {
      if ($('section#main > .ajax-error').length === 0) {
        showErrorNextToAddtoCartButton(context);
      }
    });
  });

  prestashop.on('updatedProduct', (args, formData, context) => {
    if (!args.product_url || !args.id_product_attribute) {
      return;
    }

    if (context) {
      if ($(context).is(prestashop.selectors.product.quickviewContext)) {
        return;
      }
    } else {
      /*
       * If quickview modal is present we are not on product page, so
       * we don't change the url nor title
       */
      const quickView = $('.modal.quickview');

      if (quickView.length) {
        return;
      }
    }

    let pageTitle = document.title;

    if (args.product_title) {
      pageTitle = args.product_title;
      $(document).attr('title', pageTitle);
    }

    if (!isOnPopStateEvent) {
      window.history.pushState(
        {
          id_product_attribute: args.id_product_attribute,
          form: formData,
        },
        pageTitle,
        args.product_url,
      );
    }

    isOnPopStateEvent = false;
  });

  prestashop.on('updateCart', (event) => {
    if (!event || !event.reason || event.reason.linkAction !== 'add-to-cart') {
      return;
    }

    const context = findContext(event.event ? event.event.target : null);

    if (!context) {
      return;
    }

    const $quantityWantedInput = $('#quantity_wanted, .quantity-wanted', context);
    // Force value to 1, it will automatically trigger updateProduct and reset the appropriate min value if needed
    $quantityWantedInput.val(1);
  });

  prestashop.on('showErrorNextToAddtoCartButton', (event) => {
    if (!event || !event.errorMessage) {
      return;
    }

    const context = findContext(event.event ? event.event.target : null);

    if (!context) {
      return;
    }

    showErrorNextToAddtoCartButton(
      context,
      event.errorMessage,
    );
  });
});
