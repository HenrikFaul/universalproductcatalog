[
  {
    "industry": "Telecom",
    "offering": "5G Home Internet",
    "dynamic_attributes": { "band": "n78", "speed_mbps": 1000, "configurable": true }
  },
  {
    "industry": "Automotive",
    "offering": "V8 Engine Package",
    "dynamic_attributes": { "engine_type": "V8", "emission_class": "EURO6", "configurable": true }
  },
  {
    "industry": "Banking",
    "offering": "Credit Card Gold",
    "dynamic_attributes": { "min_age": 18, "apr": 19.9, "configurable": true }
  },
  {
    "industry": "Logistics",
    "offering": "Hazmat Shipping",
    "dynamic_attributes": { "hazmat": true, "temperature_range": "2-8C", "configurable": true }
  },
  {
    "industry": "Brewery",
    "offering": "Craft Lager Batch",
    "dynamic_attributes": { "abv": 5.2, "contains_alcohol": true, "configurable": true }
  },
  {
    "industry": "Optics",
    "offering": "Progressive Lens",
    "dynamic_attributes": { "diopter": -2.5, "coating": "anti-reflective", "configurable": true }
  },
  {
    "industry": "Banking",
    "offering": "SPEC-MORTGAGE-LOAN",
    "dynamic_attributes": {
      "loanAmount": { "value": 20000000, "validation": { "min": 5000000, "max": 100000000 } },
      "termInMonths": { "value": 240, "allowed": [120, 180, 240, 360] },
      "interestRateType": "FIXED",
      "ltvRatio": 66.67,
      "configurable": true
    }
  },
  {
    "industry": "Logistics",
    "offering": "SPEC-FREIGHT-CARGO",
    "dynamic_attributes": {
      "totalWeightKg": { "value": 12000, "isRequired": true },
      "temperatureRequired": { "value": "Chilled", "allowed": ["Frozen", "Chilled", "Ambient"] },
      "hazardClass": { "value": "None", "allowed": ["None", "Flammable", "Toxic"] },
      "configurable": true
    }
  },
  {
    "industry": "Brewery",
    "offering": "SPEC-HOPS-PELLETS",
    "dynamic_attributes": {
      "hopVariety": { "value": "Citra", "allowedValues": ["Citra", "Cascade", "Mosaic", "Saaz"] },
      "alphaAcidPercentage": { "value": 10.5, "validation": { "min": 2.5, "max": 18.0 } },
      "harvestYear": 2025,
      "shelfLifeDays": 365,
      "configurable": true
    }
  },
  {
    "industry": "Optics",
    "offering": "SPEC-PRESCRIPTION-LENS",
    "dynamic_attributes": {
      "sphere_SPH": { "value": -2.25, "validation": { "min": -20.0, "max": 10.0, "step": 0.25 } },
      "cylinder_CYL": { "value": -1.0, "validation": { "min": -6.0, "max": 0.0, "step": 0.25 } },
      "axis": { "value": 90, "validation": { "min": 1, "max": 180 } },
      "refractiveIndex": 1.67,
      "configurable": true
    }
  },
  {
    "industry": "InsurTech",
    "offering": "SPEC-RISK-PROFILE",
    "dynamic_attributes": {
      "insuredAge": 41,
      "bmiCalculation": { "heightCm": 178, "weightKg": 84, "bmi": 26.5 },
      "smokingStatus": { "value": "Vaper", "allowedValues": ["Non-Smoker", "Smoker", "Vaper", "Quit < 1 Year"] },
      "preExistingConditions": ["I10", "E11"],
      "configurable": true
    }
  }
]
