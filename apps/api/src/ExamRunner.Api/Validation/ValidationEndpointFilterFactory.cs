using FluentValidation;

namespace ExamRunner.Api.Validation;

public static class ValidationEndpointFilterFactory
{
    public static EndpointFilterDelegate Create(EndpointFilterFactoryContext context, EndpointFilterDelegate next)
    {
        var validationTargets = context.MethodInfo
            .GetParameters()
            .Select((parameter, index) => new
            {
                Index = index,
                ValidatorType = typeof(IValidator<>).MakeGenericType(parameter.ParameterType)
            })
            .ToArray();

        return async invocationContext =>
        {
            foreach (var target in validationTargets)
            {
                if (invocationContext.HttpContext.RequestServices.GetService(target.ValidatorType) is not IValidator validator)
                {
                    continue;
                }

                var argument = invocationContext.Arguments[target.Index];
                if (argument is null)
                {
                    continue;
                }

                var validationContext = new ValidationContext<object>(argument);
                var result = await validator.ValidateAsync(validationContext, invocationContext.HttpContext.RequestAborted);

                if (!result.IsValid)
                {
                    throw new ValidationException(result.Errors);
                }
            }

            return await next(invocationContext);
        };
    }
}
