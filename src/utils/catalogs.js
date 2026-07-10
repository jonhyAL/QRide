export const MOTO_BRANDS = [
  'Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'Italika',
  'Bajaj', 'KTM', 'BMW', 'Ducati', 'Harley-Davidson',
  'Vento', 'TVS', 'Royal Enfield', 'Triumph', 'Indian'
];

export const MOTO_MODELS = {
  'Honda': ['Cargo 150', 'CB190R', 'CBR250R', 'Navi', 'Dio', 'XR150L', 'Wave', 'Shadow'],
  'Yamaha': ['FZ16', 'YBR125', 'MT-15', 'R15', 'FZS', 'Ray ZR', 'XTZ150', 'BWS'],
  'Suzuki': ['Gixxer', 'GSX-R150', 'Burgman', 'AX100', 'V-Strom', 'GN125'],
  'Kawasaki': ['Ninja 400', 'Z400', 'Versys 300', 'Vulcan S'],
  'Italika': ['FT150', 'WS150', 'DM150', '125Z', '250Z', 'Vort-X 200'],
  'Bajaj': ['Pulsar NS200', 'Pulsar RS200', 'Dominar 400', 'Discover', 'Boxer'],
  'KTM': ['Duke 200', 'Duke 390', 'RC 200', 'RC 390', 'Adventure 390'],
  'BMW': ['G 310 R', 'G 310 GS', 'F 750 GS', 'R 1250 GS'],
  'Vento': ['Rocketman', 'Tornado', 'Crossmax', 'Nitrox', 'Cyclone']
};
export const COMMON_MEDICINES = [
  'Paracetamol', 'Ibuprofeno', 'Aspirina', 'Omeprazol', 'Metformina', 
  'Losartán', 'Amlodipino', 'Enalapril', 'Atorvastatina', 'Levotiroxina', 
  'Insulina', 'Amoxicilina', 'Azitromicina', 'Loratadina', 'Diclofenaco',
  'Ketorolaco', 'Clonazepam', 'Salbutamol', 'Loperamida', 'Lansoprazol',
  'Metoclopramida', 'Complejo B', 'Ácido Fólico', 'Hierro', 'Calcio'
];

export const CAR_BRANDS = [
  'Nissan', 'Chevrolet', 'Volkswagen', 'Toyota', 'Kia', 
  'Honda', 'Mazda', 'Ford', 'Hyundai', 'Renault',
  'Suzuki', 'Peugeot', 'Dodge', 'Jeep', 'Seat',
  'BMW', 'Mercedes-Benz', 'Audi', 'MG', 'Fiat'
];

export const CAR_MODELS = {
  'Nissan': ['Versa', 'March', 'Sentra', 'Kicks', 'Tsuru', 'Altima', 'Frontier', 'X-Trail'],
  'Chevrolet': ['Aveo', 'Beat', 'Spark', 'Chevy', 'Onix', 'Trax', 'Tracker', 'Silverado'],
  'Volkswagen': ['Vento', 'Jetta', 'Gol', 'Polo', 'Virtus', 'Taos', 'Tiguan'],
  'Toyota': ['Yaris', 'Corolla', 'Avanza', 'Hilux', 'RAV4', 'Hiace', 'Camry'],
  'Kia': ['Rio', 'Forte', 'Sportage', 'Seltos', 'Soul', 'Sorrento'],
  'Honda': ['CR-V', 'HR-V', 'City', 'Civic', 'Accord', 'Fit'],
  'Mazda': ['Mazda 2', 'Mazda 3', 'CX-5', 'CX-3', 'CX-30'],
  'Ford': ['Figo', 'Focus', 'Fiesta', 'Ranger', 'Escape', 'Explorer', 'F-150'],
  'Hyundai': ['Grand i10', 'Creta', 'Tucson', 'Elantra', 'Accent'],
  'Renault': ['Kwid', 'Stepway', 'Duster', 'Oroch', 'Logan']
  // Otras marcas pueden usar modelos manuales o listas dinámicas
};

// Años desde el actual hasta 1980
export const CAR_YEARS = Array.from(new Array(48), (val, index) => new Date().getFullYear() + 1 - index);

export const MX_STATES = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 
  'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 
  'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 
  'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 
  'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 
  'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 
  'Yucatán', 'Zacatecas'
];

// Base mínima, podemos enriquecer luego según las necesidades
export const COMMON_HOSPITALS = [
  'Hospital General de Zona (IMSS)',
  'Hospital Regional (IMSS)',
  'Unidad de Medicina Familiar (IMSS)',
  'Hospital General (ISSSTE)',
  'Hospital Regional (ISSSTE)',
  'Clínica de Medicina Familiar (ISSSTE)',
  'Hospital General (SSA)',
  'Centro de Salud (SSA)',
  'Hospital Civil',
  'Hospital Militar (SEDENA)',
  'Centro Médico Nacional',
  'Otro...'
];
