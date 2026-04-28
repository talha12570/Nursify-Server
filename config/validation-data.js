// Validation datasets for CNIC and License verification
// These are dummy datasets for testing purposes

// Valid CNIC numbers (normalized without dashes)
const validCNICs = [
    '4210111111111',
    '4210122222222',
    '4210133333333',
    '3520144444444',
    '3520155555555',
    '3520166666666',
    '6110177777777',
    '6110188888888',
    '6110199999999',
    '3740110101011',
    '3740120202022',
    '3740130303033',
    '1730140404044',
    '1730150505055',
    '1730160606066',
    '5440170707077',
    '5440180808088',
    '5440190909099',
    '3310112121211',
    '3310123232322',
    '3310134343433',
    '4250145454544',
    '4250156565655',
    '4250167676766',
    '1410178787877',
    '1410189898988',
    '1410190919199',
    '7150111223341',
    '7150122334452',
    '7150133445563'
];

// Valid Registered Nurse (RN) License Numbers
const validRNLicenses = [
    'PNCRN20211023',
    'PNCRN20201145',
    'PNCRN20191289',
    'PNCRN20221342',
    'PNCRN20231407',
    'PNCRN20181566',
    'PNCRN20211621',
    'PNCRN20201784',
    'PNCRN20191899',
    'PNCRN20221953'
];

// Valid Licensed Practical Nurse (LPN) License Numbers
const validLPNLicenses = [
    'PNCLPN20212104',
    'PNCLPN20202237',
    'PNCLPN20192368',
    'PNCLPN20222489',
    'PNCLPN20232591',
    'PNCLPN20182675',
    'PNCLPN20212793',
    'PNCLPN20202846',
    'PNCLPN20192962',
    'PNCLPN20223058'
];

/**
 * Normalize CNIC by removing dashes and spaces
 * @param {string} cnic - CNIC number with or without dashes
 * @returns {string} - Normalized CNIC number
 */
function normalizeCNIC(cnic) {
    if (!cnic) return '';
    return cnic.replace(/[-\s]/g, '');
}

/**
 * Validate CNIC against the dummy dataset
 * @param {string} cnic - CNIC number to validate
 * @returns {boolean} - True if CNIC is valid
 */
function validateCNIC(cnic) {
    const normalized = normalizeCNIC(cnic);
    return validCNICs.includes(normalized);
}

/**
 * Validate Nurse license number
 * @param {string} licenseNumber - License number to validate
 * @returns {object} - { isValid: boolean, type: 'RN' | 'LPN' | null }
 */
function validateNurseLicense(licenseNumber) {
    if (!licenseNumber) {
        return { isValid: false, type: null };
    }

    const normalized = licenseNumber.trim().toUpperCase();

    if (validRNLicenses.includes(normalized)) {
        return { isValid: true, type: 'RN' };
    }

    if (validLPNLicenses.includes(normalized)) {
        return { isValid: true, type: 'LPN' };
    }

    return { isValid: false, type: null };
}

/**
 * Check if CNIC is already used by another user
 * @param {string} cnic - CNIC to check
 * @param {object} User - User model
 * @param {string} excludeUserId - User ID to exclude from check (for updates)
 * @returns {Promise<boolean>} - True if CNIC is available
 */
async function isCNICAvailable(cnic, User, excludeUserId = null) {
    const normalized = normalizeCNIC(cnic);
    const query = { cnicNumber: normalized };
    
    if (excludeUserId) {
        query._id = { $ne: excludeUserId };
    }

    const existingUser = await User.findOne(query);
    return !existingUser;
}

/**
 * Check if license number is already used by another nurse
 * @param {string} licenseNumber - License number to check
 * @param {object} User - User model
 * @param {string} excludeUserId - User ID to exclude from check (for updates)
 * @returns {Promise<boolean>} - True if license is available
 */
async function isLicenseAvailable(licenseNumber, User, excludeUserId = null) {
    if (!licenseNumber) return true;

    const normalized = licenseNumber.trim().toUpperCase();
    const query = { licenseNumber: normalized };
    
    if (excludeUserId) {
        query._id = { $ne: excludeUserId };
    }

    const existingUser = await User.findOne(query);
    return !existingUser;
}

module.exports = {
    validCNICs,
    validRNLicenses,
    validLPNLicenses,
    normalizeCNIC,
    validateCNIC,
    validateNurseLicense,
    isCNICAvailable,
    isLicenseAvailable
};
