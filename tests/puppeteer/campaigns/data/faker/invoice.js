const faker = require('faker');

module.exports = class Invoice {
  constructor(invoiceOptions = {}) {
    this.invoiceNumber = invoiceOptions.invoiceNumber || faker.random.number({min: 1, max: 200}).toString();
    this.legalFreeText = invoiceOptions.legalFreeText || faker.lorem.sentence();
    this.footerText = invoiceOptions.footerText || faker.lorem.word();
  }
};