const Validator = require('validatorjs');

// Generic validation function
function validate(data, rules, options = {}) {
    return new Promise((resolve, reject) => {
        const validation = new Validator(data, rules);

        if (validation.fails()) {
            reject(validation.errors.all());
        } else {
            resolve();
        }
    });
}

module.exports = validate;
