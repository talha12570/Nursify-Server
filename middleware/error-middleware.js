
const errorMiddleware = (err, req, res, next) => {
    if (err?.code === 11000) {
        const duplicateField = Object.keys(err?.keyPattern || err?.keyValue || {})[0] || 'field';
        return res.status(409).json({
            message: `${duplicateField} already exists`,
            field: duplicateField,
            extraDetail: 'Duplicate key error',
        });
    }

   
    const status = err?.status || 500;
    const message = err?.message || 'Internal Backend Error';
    const extraDetail = err?.extraDetail || 'Error From Backend';

    res.status(status).json({ message, extraDetail });
};

module.exports = errorMiddleware;