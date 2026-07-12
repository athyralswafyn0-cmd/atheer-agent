export const errorHandler = (error: any, request: any, reply: any) => {
  // Log the error
  request.log.error(error);

  // Send a generic error message
  return reply
    .status(500)
    .send({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
};