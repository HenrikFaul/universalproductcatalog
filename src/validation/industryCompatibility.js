export function validateIndustryCompatibility(selectedOfferings) {
  const set = new Set(selectedOfferings);
  const errors = [];

  // Biological/Regulatory incompatibility example
  if (set.has('Craft Lager Batch') && set.has('Hazmat Shipping')) {
    errors.push('Food-grade product cannot be bundled with hazardous logistics flow.');
  }

  // Physical incompatibility example
  if (set.has('V8 Engine Package') && set.has('Progressive Lens')) {
    errors.push('Automotive engine BOM cannot include optical lens component.');
  }

  return errors;
}
