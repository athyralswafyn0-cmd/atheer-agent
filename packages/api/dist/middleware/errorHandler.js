export const errorHandler = (error, request, reply) => {
    // Log the error
    request.log.error(error);
    // Send a generic error message
    return reply
        .status(500)
        .send({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
};
