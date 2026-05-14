"""Idempotent seed script. Inserts 20 patients with notes if patient count < 20."""
from __future__ import annotations

import random
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Note, Patient

PATIENTS: list[dict] = [
    {"first_name": "Marisol", "last_name": "Ortega", "dob": date(1971, 8, 4),
     "phone": "+14155550142", "email": "m.ortega@example.com",
     "address": "2812 Folsom St, San Francisco, CA",
     "blood_type": "O+", "status": "active",
     "conditions": ["Hypertension", "Type 2 diabetes"], "allergies": ["Sulfa drugs"]},
    {"first_name": "Theo", "last_name": "Whitfield", "dob": date(1958, 2, 19),
     "phone": "+14155550118", "email": None,
     "address": "118 Clement St, San Francisco, CA",
     "blood_type": "A-", "status": "follow_up",
     "conditions": ["CHF", "CKD stage 3"], "allergies": []},
    {"first_name": "Junpei", "last_name": "Saito", "dob": date(1993, 11, 30),
     "phone": "+14155550984", "email": "j.saito@example.com", "address": None,
     "blood_type": "B+", "status": "active",
     "conditions": [], "allergies": []},
    {"first_name": "Asha", "last_name": "Patel", "dob": date(1984, 5, 22),
     "phone": "+14155550031", "email": "asha.p@example.com",
     "address": "44 Divisadero, SF, CA",
     "blood_type": "AB+", "status": "inactive",
     "conditions": ["Asthma"], "allergies": ["Penicillin"]},
    {"first_name": "Eleanor", "last_name": "Huxley", "dob": date(1948, 1, 9),
     "phone": "+14155550612", "email": None,
     "address": "1900 California St, SF, CA",
     "blood_type": "O-", "status": "active",
     "conditions": ["Atrial fibrillation"], "allergies": ["Penicillin"]},
    {"first_name": "Rafael", "last_name": "Becerra", "dob": date(1997, 3, 14),
     "phone": "+14155550227", "email": "r.becerra@example.com", "address": None,
     "blood_type": "A+", "status": "active",
     "conditions": ["Migraine"], "allergies": []},
    {"first_name": "Naledi", "last_name": "Khumalo", "dob": date(1990, 7, 7),
     "phone": "+14155550118", "email": "n.khumalo@example.com",
     "address": "2300 Sutter St, SF, CA",
     "blood_type": "O+", "status": "follow_up",
     "conditions": ["Hypothyroidism"], "allergies": []},
    {"first_name": "Yusuf", "last_name": "Demir", "dob": date(1965, 9, 1),
     "phone": "+14155550401", "email": None, "address": None,
     "blood_type": "B-", "status": "active",
     "conditions": ["GERD"], "allergies": []},
    {"first_name": "Sophie", "last_name": "Laurent", "dob": date(1980, 12, 12),
     "phone": "+14155550779", "email": "sophie.l@example.com",
     "address": "1212 Lombard St, SF, CA",
     "blood_type": "AB-", "status": "active",
     "conditions": [], "allergies": ["Latex"]},
    {"first_name": "Devon", "last_name": "Iverson", "dob": date(1976, 4, 25),
     "phone": "+14155550882", "email": None, "address": None,
     "blood_type": "A+", "status": "follow_up",
     "conditions": ["Sleep apnea"], "allergies": []},
    {"first_name": "Priya", "last_name": "Iyer", "dob": date(2001, 6, 18),
     "phone": "+14155550334", "email": "p.iyer@example.com", "address": None,
     "blood_type": "O+", "status": "active",
     "conditions": [], "allergies": ["Shellfish"]},
    {"first_name": "Henry", "last_name": "Okonkwo", "dob": date(1955, 10, 2),
     "phone": "+14155550456", "email": None,
     "address": "98 Page St, SF, CA",
     "blood_type": "B+", "status": "active",
     "conditions": ["Hypertension"], "allergies": []},
    {"first_name": "Linnea", "last_name": "Bergstrom", "dob": date(1988, 2, 14),
     "phone": "+14155550101", "email": "linnea.b@example.com", "address": None,
     "blood_type": "A-", "status": "active",
     "conditions": [], "allergies": []},
    {"first_name": "Carlos", "last_name": "Mendoza", "dob": date(1962, 8, 30),
     "phone": "+14155550567", "email": "c.mendoza@example.com",
     "address": "200 Valencia St, SF, CA",
     "blood_type": "O+", "status": "follow_up",
     "conditions": ["COPD"], "allergies": []},
    {"first_name": "Imani", "last_name": "Brooks", "dob": date(1994, 5, 5),
     "phone": "+14155550719", "email": "imani.b@example.com", "address": None,
     "blood_type": "AB+", "status": "active",
     "conditions": [], "allergies": []},
    {"first_name": "Wei", "last_name": "Chen", "dob": date(1972, 11, 21),
     "phone": "+14155550845", "email": None, "address": None,
     "blood_type": "B-", "status": "inactive",
     "conditions": ["Hyperlipidemia"], "allergies": []},
    {"first_name": "Magdalena", "last_name": "Rossi", "dob": date(1969, 1, 27),
     "phone": "+14155550293", "email": "m.rossi@example.com",
     "address": "55 Castro St, SF, CA",
     "blood_type": "A+", "status": "active",
     "conditions": ["Osteoarthritis"], "allergies": ["Ibuprofen"]},
    {"first_name": "Omar", "last_name": "Hassan", "dob": date(2003, 3, 9),
     "phone": "+14155550624", "email": "omar.h@example.com", "address": None,
     "blood_type": "O-", "status": "active",
     "conditions": [], "allergies": ["Peanuts"]},
    {"first_name": "Beatrice", "last_name": "Voss", "dob": date(1944, 7, 17),
     "phone": "+14155550850", "email": None,
     "address": "12 Steiner St, SF, CA",
     "blood_type": "AB-", "status": "follow_up",
     "conditions": ["Diabetes type 2", "Macular degeneration"], "allergies": []},
    {"first_name": "Kenji", "last_name": "Tanaka", "dob": date(1983, 9, 28),
     "phone": "+14155550902", "email": "k.tanaka@example.com", "address": None,
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

AUTHORS = ["Dr. A. Reeves", "Dr. R. Bhat", "Dr. K. Tran"]


def seed(session: Session) -> int:
    existing = session.query(Patient).count()
    if existing >= len(PATIENTS):
        return 0

    rng = random.Random(20260514)  # deterministic
    inserted = 0
    now = datetime.now(timezone.utc)

    for spec in PATIENTS:
        match = (
            session.query(Patient)
            .filter_by(first_name=spec["first_name"], last_name=spec["last_name"])
            .first()
        )
        if match:
            continue

        patient = Patient(
            id=uuid.uuid4(),
            first_name=spec["first_name"],
            last_name=spec["last_name"],
            date_of_birth=spec["dob"],
            phone=spec["phone"],
            email=spec["email"],
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
                author=rng.choice(AUTHORS),
                created_at=ts,
            )
            patient.notes.append(note)
            if most_recent is None or ts > most_recent:
                most_recent = ts

        patient.last_visit_at = most_recent
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
