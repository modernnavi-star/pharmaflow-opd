
-- Medicines catalog
CREATE TABLE public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  generic_name TEXT,
  strength TEXT,
  form TEXT,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'tablets',
  reorder_level INTEGER NOT NULL DEFAULT 50,
  current_stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medicines_name ON public.medicines (lower(name));
CREATE INDEX idx_medicines_generic ON public.medicines (lower(generic_name));

-- Stock entries (daily log)
CREATE TABLE public.stock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_stock INTEGER NOT NULL DEFAULT 0,
  received INTEGER NOT NULL DEFAULT 0,
  dispensed INTEGER NOT NULL DEFAULT 0,
  closing_stock INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (medicine_id, entry_date)
);

CREATE INDEX idx_stock_entries_date ON public.stock_entries (entry_date DESC);
CREATE INDEX idx_stock_entries_medicine ON public.stock_entries (medicine_id);

-- Trigger: keep medicines.current_stock and updated_at in sync with latest entry
CREATE OR REPLACE FUNCTION public.sync_medicine_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.medicines
  SET current_stock = NEW.closing_stock,
      updated_at = now()
  WHERE id = NEW.medicine_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_medicine_stock
AFTER INSERT OR UPDATE ON public.stock_entries
FOR EACH ROW EXECUTE FUNCTION public.sync_medicine_stock();

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicines TO anon, authenticated;
GRANT ALL ON public.medicines TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_entries TO anon, authenticated;
GRANT ALL ON public.stock_entries TO service_role;

-- RLS (open access — single-tenant pharmacy use; add auth later)
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read medicines" ON public.medicines FOR SELECT USING (true);
CREATE POLICY "Public write medicines" ON public.medicines FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update medicines" ON public.medicines FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete medicines" ON public.medicines FOR DELETE USING (true);

CREATE POLICY "Public read entries" ON public.stock_entries FOR SELECT USING (true);
CREATE POLICY "Public write entries" ON public.stock_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update entries" ON public.stock_entries FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete entries" ON public.stock_entries FOR DELETE USING (true);

-- Seed: Karnataka State Essential Drug List (commonly stocked subset)
INSERT INTO public.medicines (name, generic_name, strength, form, category, unit, reorder_level) VALUES
('Paracetamol', 'Paracetamol', '500 mg', 'Tablet', 'Analgesic / Antipyretic', 'tablets', 200),
('Paracetamol Syrup', 'Paracetamol', '125 mg/5 ml', 'Syrup', 'Analgesic / Antipyretic', 'bottles', 30),
('Ibuprofen', 'Ibuprofen', '400 mg', 'Tablet', 'NSAID', 'tablets', 100),
('Diclofenac Sodium', 'Diclofenac', '50 mg', 'Tablet', 'NSAID', 'tablets', 100),
('Diclofenac Injection', 'Diclofenac', '75 mg/3 ml', 'Injection', 'NSAID', 'ampoules', 50),
('Aspirin', 'Aspirin', '75 mg', 'Tablet', 'Antiplatelet', 'tablets', 100),
('Tramadol', 'Tramadol', '50 mg', 'Capsule', 'Opioid Analgesic', 'capsules', 50),
('Morphine Sulphate', 'Morphine', '10 mg', 'Tablet', 'Opioid Analgesic', 'tablets', 30),
('Amoxicillin', 'Amoxicillin', '500 mg', 'Capsule', 'Antibiotic', 'capsules', 150),
('Amoxicillin + Clavulanic Acid', 'Co-amoxiclav', '625 mg', 'Tablet', 'Antibiotic', 'tablets', 100),
('Azithromycin', 'Azithromycin', '500 mg', 'Tablet', 'Antibiotic', 'tablets', 100),
('Ciprofloxacin', 'Ciprofloxacin', '500 mg', 'Tablet', 'Antibiotic', 'tablets', 100),
('Doxycycline', 'Doxycycline', '100 mg', 'Capsule', 'Antibiotic', 'capsules', 80),
('Cefixime', 'Cefixime', '200 mg', 'Tablet', 'Antibiotic', 'tablets', 80),
('Ceftriaxone Injection', 'Ceftriaxone', '1 g', 'Injection', 'Antibiotic', 'vials', 50),
('Metronidazole', 'Metronidazole', '400 mg', 'Tablet', 'Antibiotic / Antiprotozoal', 'tablets', 100),
('Cotrimoxazole', 'Sulfamethoxazole + Trimethoprim', '480 mg', 'Tablet', 'Antibiotic', 'tablets', 100),
('Gentamicin Injection', 'Gentamicin', '80 mg/2 ml', 'Injection', 'Antibiotic', 'ampoules', 50),
('Benzathine Penicillin', 'Benzathine Benzylpenicillin', '12 lakh IU', 'Injection', 'Antibiotic', 'vials', 30),
('Albendazole', 'Albendazole', '400 mg', 'Tablet', 'Anthelmintic', 'tablets', 100),
('Ivermectin', 'Ivermectin', '12 mg', 'Tablet', 'Anthelmintic', 'tablets', 50),
('Fluconazole', 'Fluconazole', '150 mg', 'Tablet', 'Antifungal', 'tablets', 60),
('Clotrimazole Cream', 'Clotrimazole', '1%', 'Cream', 'Antifungal', 'tubes', 30),
('Acyclovir', 'Acyclovir', '400 mg', 'Tablet', 'Antiviral', 'tablets', 50),
('Chloroquine', 'Chloroquine', '250 mg', 'Tablet', 'Antimalarial', 'tablets', 80),
('Artemether + Lumefantrine', 'Artemether + Lumefantrine', '80/480 mg', 'Tablet', 'Antimalarial', 'tablets', 50),
('Primaquine', 'Primaquine', '7.5 mg', 'Tablet', 'Antimalarial', 'tablets', 50),
('Rifampicin', 'Rifampicin', '450 mg', 'Tablet', 'Anti-TB', 'tablets', 60),
('Isoniazid', 'Isoniazid', '300 mg', 'Tablet', 'Anti-TB', 'tablets', 60),
('Pyrazinamide', 'Pyrazinamide', '750 mg', 'Tablet', 'Anti-TB', 'tablets', 60),
('Ethambutol', 'Ethambutol', '800 mg', 'Tablet', 'Anti-TB', 'tablets', 60),
('Amlodipine', 'Amlodipine', '5 mg', 'Tablet', 'Antihypertensive', 'tablets', 150),
('Atenolol', 'Atenolol', '50 mg', 'Tablet', 'Beta-blocker', 'tablets', 100),
('Metoprolol', 'Metoprolol', '25 mg', 'Tablet', 'Beta-blocker', 'tablets', 100),
('Enalapril', 'Enalapril', '5 mg', 'Tablet', 'ACE Inhibitor', 'tablets', 100),
('Losartan', 'Losartan', '50 mg', 'Tablet', 'ARB', 'tablets', 100),
('Telmisartan', 'Telmisartan', '40 mg', 'Tablet', 'ARB', 'tablets', 100),
('Hydrochlorothiazide', 'Hydrochlorothiazide', '12.5 mg', 'Tablet', 'Diuretic', 'tablets', 80),
('Furosemide', 'Furosemide', '40 mg', 'Tablet', 'Diuretic', 'tablets', 80),
('Spironolactone', 'Spironolactone', '25 mg', 'Tablet', 'Diuretic', 'tablets', 60),
('Atorvastatin', 'Atorvastatin', '10 mg', 'Tablet', 'Statin', 'tablets', 100),
('Clopidogrel', 'Clopidogrel', '75 mg', 'Tablet', 'Antiplatelet', 'tablets', 80),
('Digoxin', 'Digoxin', '0.25 mg', 'Tablet', 'Cardiac Glycoside', 'tablets', 40),
('Glyceryl Trinitrate', 'GTN', '0.5 mg', 'Sublingual Tablet', 'Antianginal', 'tablets', 40),
('Metformin', 'Metformin', '500 mg', 'Tablet', 'Antidiabetic', 'tablets', 200),
('Glimepiride', 'Glimepiride', '2 mg', 'Tablet', 'Antidiabetic', 'tablets', 100),
('Glibenclamide', 'Glibenclamide', '5 mg', 'Tablet', 'Antidiabetic', 'tablets', 80),
('Insulin Regular', 'Human Insulin', '40 IU/ml', 'Injection', 'Antidiabetic', 'vials', 30),
('Insulin NPH', 'Human Insulin Isophane', '40 IU/ml', 'Injection', 'Antidiabetic', 'vials', 30),
('Levothyroxine', 'Levothyroxine', '50 mcg', 'Tablet', 'Thyroid Hormone', 'tablets', 80),
('Omeprazole', 'Omeprazole', '20 mg', 'Capsule', 'PPI', 'capsules', 150),
('Pantoprazole', 'Pantoprazole', '40 mg', 'Tablet', 'PPI', 'tablets', 150),
('Ranitidine', 'Ranitidine', '150 mg', 'Tablet', 'H2 Blocker', 'tablets', 80),
('Ondansetron', 'Ondansetron', '4 mg', 'Tablet', 'Antiemetic', 'tablets', 80),
('Domperidone', 'Domperidone', '10 mg', 'Tablet', 'Antiemetic', 'tablets', 80),
('ORS Sachet', 'Oral Rehydration Salts', 'WHO Formula', 'Powder', 'Electrolyte', 'sachets', 200),
('Zinc Sulphate', 'Zinc Sulphate', '20 mg', 'Tablet', 'Mineral Supplement', 'tablets', 100),
('Loperamide', 'Loperamide', '2 mg', 'Tablet', 'Antidiarrhoeal', 'tablets', 80),
('Hyoscine Butylbromide', 'Hyoscine', '10 mg', 'Tablet', 'Antispasmodic', 'tablets', 80),
('Lactulose', 'Lactulose', '10 g/15 ml', 'Syrup', 'Laxative', 'bottles', 30),
('Salbutamol', 'Salbutamol', '4 mg', 'Tablet', 'Bronchodilator', 'tablets', 100),
('Salbutamol Inhaler', 'Salbutamol', '100 mcg/dose', 'Inhaler', 'Bronchodilator', 'inhalers', 40),
('Budesonide Inhaler', 'Budesonide', '200 mcg/dose', 'Inhaler', 'Inhaled Steroid', 'inhalers', 30),
('Montelukast', 'Montelukast', '10 mg', 'Tablet', 'Leukotriene Antagonist', 'tablets', 60),
('Theophylline', 'Theophylline', '100 mg', 'Tablet', 'Bronchodilator', 'tablets', 60),
('Cetirizine', 'Cetirizine', '10 mg', 'Tablet', 'Antihistamine', 'tablets', 150),
('Chlorpheniramine', 'Chlorpheniramine', '4 mg', 'Tablet', 'Antihistamine', 'tablets', 100),
('Pheniramine Maleate Injection', 'Pheniramine', '22.75 mg/ml', 'Injection', 'Antihistamine', 'ampoules', 50),
('Prednisolone', 'Prednisolone', '5 mg', 'Tablet', 'Steroid', 'tablets', 100),
('Dexamethasone Injection', 'Dexamethasone', '4 mg/ml', 'Injection', 'Steroid', 'ampoules', 50),
('Hydrocortisone Injection', 'Hydrocortisone', '100 mg', 'Injection', 'Steroid', 'vials', 40),
('Adrenaline Injection', 'Epinephrine', '1 mg/ml', 'Injection', 'Emergency', 'ampoules', 30),
('Atropine Injection', 'Atropine', '0.6 mg/ml', 'Injection', 'Emergency', 'ampoules', 30),
('Diazepam', 'Diazepam', '5 mg', 'Tablet', 'Benzodiazepine', 'tablets', 60),
('Diazepam Injection', 'Diazepam', '10 mg/2 ml', 'Injection', 'Benzodiazepine', 'ampoules', 30),
('Phenytoin', 'Phenytoin', '100 mg', 'Tablet', 'Anticonvulsant', 'tablets', 80),
('Carbamazepine', 'Carbamazepine', '200 mg', 'Tablet', 'Anticonvulsant', 'tablets', 80),
('Valproate Sodium', 'Sodium Valproate', '200 mg', 'Tablet', 'Anticonvulsant', 'tablets', 80),
('Amitriptyline', 'Amitriptyline', '25 mg', 'Tablet', 'Antidepressant', 'tablets', 60),
('Fluoxetine', 'Fluoxetine', '20 mg', 'Capsule', 'Antidepressant', 'capsules', 60),
('Haloperidol', 'Haloperidol', '5 mg', 'Tablet', 'Antipsychotic', 'tablets', 50),
('Risperidone', 'Risperidone', '2 mg', 'Tablet', 'Antipsychotic', 'tablets', 50),
('Folic Acid', 'Folic Acid', '5 mg', 'Tablet', 'Vitamin', 'tablets', 200),
('Iron + Folic Acid', 'Ferrous Sulphate + Folic Acid', '60 mg + 0.5 mg', 'Tablet', 'Hematinic', 'tablets', 300),
('Vitamin B Complex', 'B-Complex', '-', 'Tablet', 'Vitamin', 'tablets', 200),
('Vitamin C', 'Ascorbic Acid', '500 mg', 'Tablet', 'Vitamin', 'tablets', 200),
('Vitamin D3', 'Cholecalciferol', '60000 IU', 'Capsule', 'Vitamin', 'capsules', 100),
('Vitamin A', 'Retinol', '200000 IU', 'Capsule', 'Vitamin', 'capsules', 80),
('Calcium + Vitamin D3', 'Calcium Carbonate + D3', '500 mg + 250 IU', 'Tablet', 'Mineral Supplement', 'tablets', 200),
('Normal Saline', '0.9% Sodium Chloride', '500 ml', 'IV Fluid', 'IV Fluid', 'bottles', 100),
('Ringer Lactate', 'Ringer Lactate', '500 ml', 'IV Fluid', 'IV Fluid', 'bottles', 100),
('Dextrose 5%', 'Dextrose', '500 ml', 'IV Fluid', 'IV Fluid', 'bottles', 80),
('Dextrose Normal Saline', 'DNS', '500 ml', 'IV Fluid', 'IV Fluid', 'bottles', 80),
('Povidone Iodine', 'Povidone Iodine', '5%', 'Solution', 'Antiseptic', 'bottles', 40),
('Hydrogen Peroxide', 'Hydrogen Peroxide', '6%', 'Solution', 'Antiseptic', 'bottles', 30),
('Silver Sulfadiazine Cream', 'Silver Sulfadiazine', '1%', 'Cream', 'Topical', 'tubes', 30),
('Misoprostol', 'Misoprostol', '200 mcg', 'Tablet', 'Obstetric', 'tablets', 40),
('Oxytocin Injection', 'Oxytocin', '10 IU/ml', 'Injection', 'Obstetric', 'ampoules', 50),
('Magnesium Sulphate Injection', 'Magnesium Sulphate', '50% w/v', 'Injection', 'Electrolyte', 'ampoules', 40);
