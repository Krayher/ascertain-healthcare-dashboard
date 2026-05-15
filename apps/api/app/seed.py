"""Idempotent seed script. Inserts 20 patients with notes if patient count < 20."""
from __future__ import annotations

import random
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Note, Patient

PATIENTS: list[dict] = [
    {"name": "Marisol Ortega", "dob": date(1971, 8, 4),
     "contact": "+14155550142 | m.ortega@example.com",
     "address": "2812 Folsom St, San Francisco, CA",
     "blood_type": "O+", "status": "active",
     "conditions": ["Hypertension", "Type 2 diabetes"], "allergies": ["Sulfa drugs"]},
    {"name": "Theo Whitfield", "dob": date(1958, 2, 19),
     "contact": "+14155550118",
     "address": "118 Clement St, San Francisco, CA",
     "blood_type": "A-", "status": "follow_up",
     "conditions": ["CHF", "CKD stage 3"], "allergies": []},
    {"name": "Junpei Saito", "dob": date(1993, 11, 30),
     "contact": "+14155550984 | j.saito@example.com", "address": None,
     "blood_type": "B+", "status": "active",
     "conditions": [], "allergies": []},
    {"name": "Asha Patel", "dob": date(1984, 5, 22),
     "contact": "+14155550031 | asha.p@example.com",
     "address": "44 Divisadero, SF, CA",
     "blood_type": "AB+", "status": "inactive",
     "conditions": ["Asthma"], "allergies": ["Penicillin"]},
    {"name": "Eleanor Huxley", "dob": date(1948, 1, 9),
     "contact": "+14155550612",
     "address": "1900 California St, SF, CA",
     "blood_type": "O-", "status": "active",
     "conditions": ["Atrial fibrillation"], "allergies": ["Penicillin"]},
    {"name": "Rafael Becerra", "dob": date(1997, 3, 14),
     "contact": "+14155550227 | r.becerra@example.com", "address": None,
     "blood_type": "A+", "status": "active",
     "conditions": ["Migraine"], "allergies": []},
    {"name": "Naledi Khumalo", "dob": date(1990, 7, 7),
     "contact": "+14155550118 | n.khumalo@example.com",
     "address": "2300 Sutter St, SF, CA",
     "blood_type": "O+", "status": "follow_up",
     "conditions": ["Hypothyroidism"], "allergies": []},
    {"name": "Yusuf Demir", "dob": date(1965, 9, 1),
     "contact": "+14155550401", "address": None,
     "blood_type": "B-", "status": "active",
     "conditions": ["GERD"], "allergies": []},
    {"name": "Sophie Laurent", "dob": date(1980, 12, 12),
     "contact": "+14155550779 | sophie.l@example.com",
     "address": "1212 Lombard St, SF, CA",
     "blood_type": "AB-", "status": "active",
     "conditions": [], "allergies": ["Latex"]},
    {"name": "Devon Iverson", "dob": date(1976, 4, 25),
     "contact": "+14155550882", "address": None,
     "blood_type": "A+", "status": "follow_up",
     "conditions": ["Sleep apnea"], "allergies": []},
    {"name": "Priya Iyer", "dob": date(2001, 6, 18),
     "contact": "+14155550334 | p.iyer@example.com", "address": None,
     "blood_type": "O+", "status": "active",
     "conditions": [], "allergies": ["Shellfish"]},
    {"name": "Henry Okonkwo", "dob": date(1955, 10, 2),
     "contact": "+14155550456",
     "address": "98 Page St, SF, CA",
     "blood_type": "B+", "status": "active",
     "conditions": ["Hypertension"], "allergies": []},
    {"name": "Linnea Bergstrom", "dob": date(1988, 2, 14),
     "contact": "+14155550101 | linnea.b@example.com", "address": None,
     "blood_type": "A-", "status": "active",
     "conditions": [], "allergies": []},
    {"name": "Carlos Mendoza", "dob": date(1962, 8, 30),
     "contact": "+14155550567 | c.mendoza@example.com",
     "address": "200 Valencia St, SF, CA",
     "blood_type": "O+", "status": "follow_up",
     "conditions": ["COPD"], "allergies": []},
    {"name": "Imani Brooks", "dob": date(1994, 5, 5),
     "contact": "+14155550719 | imani.b@example.com", "address": None,
     "blood_type": "AB+", "status": "active",
     "conditions": [], "allergies": []},
    {"name": "Wei Chen", "dob": date(1972, 11, 21),
     "contact": "+14155550845", "address": None,
     "blood_type": "B-", "status": "inactive",
     "conditions": ["Hyperlipidemia"], "allergies": []},
    {"name": "Magdalena Rossi", "dob": date(1969, 1, 27),
     "contact": "+14155550293 | m.rossi@example.com",
     "address": "55 Castro St, SF, CA",
     "blood_type": "A+", "status": "active",
     "conditions": ["Osteoarthritis"], "allergies": ["Ibuprofen"]},
    {"name": "Omar Hassan", "dob": date(2003, 3, 9),
     "contact": "+14155550624 | omar.h@example.com", "address": None,
     "blood_type": "O-", "status": "active",
     "conditions": [], "allergies": ["Peanuts"]},
    {"name": "Beatrice Voss", "dob": date(1944, 7, 17),
     "contact": "+14155550850",
     "address": "12 Steiner St, SF, CA",
     "blood_type": "AB-", "status": "follow_up",
     "conditions": ["Diabetes type 2", "Macular degeneration"], "allergies": []},
    {"name": "Kenji Tanaka", "dob": date(1983, 9, 28),
     "contact": "+14155550902 | k.tanaka@example.com", "address": None,
     "blood_type": "O+", "status": "active",
     "conditions": [], "allergies": []},
]

NOTE_SNIPPETS = [
    "Routine check-up. Vitals within normal limits.",
    "Patient reports occasional headaches; recommended hydration log.",
    "Increased lisinopril to 20mg daily. Home BP log review at next visit.",
    "A1C trending down. Continue current metformin dose.",
    "Discussed sleep hygiene. Patient will trial new bedtime routine for 2 weeks.",
    "Annual physical complete; labs ordered (CMP, lipid, A1C).",
    "Counseled on sodium intake and weekly cuff checks.",
    "Mild bilateral ankle edema; considering low-dose diuretic if persistent.",
    "Patient stable. Follow up in 3 months unless symptoms recur.",
    "Reviewed inhaler technique; refilled albuterol.",
]


def seed(session: Session) -> int:
    existing = session.query(Patient).count()
    if existing >= len(PATIENTS):
        return 0

    rng = random.Random(20260514)  # deterministic
    inserted = 0
    now = datetime.now(timezone.utc)

    for spec in PATIENTS:
        match = session.query(Patient).filter_by(name=spec["name"]).first()
        if match:
            continue

        patient = Patient(
            id=uuid.uuid4(),
            name=spec["name"],
            date_of_birth=spec["dob"],
            contact=spec["contact"],
            address=spec["address"],
            blood_type=spec["blood_type"],
            status=spec["status"],
            conditions=spec["conditions"],
            allergies=spec["allergies"],
        )

        n_notes = rng.randint(3, 8)
        most_recent: datetime | None = None
        for _ in range(n_notes):
            days_ago = rng.randint(1, 90)
            ts = now - timedelta(days=days_ago, hours=rng.randint(0, 23))
            note = Note(
                content=rng.choice(NOTE_SNIPPETS),
                timestamp=ts,
            )
            patient.notes.append(note)
            if most_recent is None or ts > most_recent:
                most_recent = ts

        patient.last_visit = most_recent
        session.add(patient)
        inserted += 1

    session.commit()
    return inserted


def main() -> None:
    with SessionLocal() as session:
        inserted = seed(session)
        print(f"Seed complete; inserted {inserted} patients.")


if __name__ == "__main__":
    main()
