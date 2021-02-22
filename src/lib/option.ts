export function options(name: string, defaultValues?: string[]): string[] {
  const values: string[] = [];
  if (window.location.search && window.location.search.length > 1) {
    const options = window.location.search.substring(1).split('&');

    options.forEach((option) => {
      const optionSegments = option.split('=');
      if (optionSegments.length === 2) {
        const optionName = optionSegments[0];
        const optionValue = optionSegments[1];
        if (optionName === name) {
          values.push(decodeURIComponent(optionValue));
        }
      }
    });
  }

  return values.length || !defaultValues ? values : defaultValues;
}

export function option(name: string, defaultValue: string): string {
  const values = options(name);

  return values.length ? values[0] : defaultValue;
}
