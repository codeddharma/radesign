import { getDb } from "@/lib/admin/mongo";

export type EnquiryStatus = "new"|"assigned"|"contacted"|"qualified"|"closed"|"spam";
export interface Enquiry{id:string;name:string;email:string;projectType:string;location:string;message:string;source:string;consentAt:string;status:EnquiryStatus;createdAt:string;}

type EnquiryDoc = Omit<Enquiry, "id"> & { _id: string };

const map = ({ _id, ...rest }: EnquiryDoc): Enquiry => ({ id: _id, ...rest });

async function collection() {
  return (await getDb()).collection<EnquiryDoc>("enquiries");
}

export async function createEnquiry(input: Omit<Enquiry, "id" | "createdAt" | "status">): Promise<Enquiry> {
  const enquiry: Enquiry = { ...input, id: `enquiry-${crypto.randomUUID()}`, createdAt: new Date().toISOString(), status: "new" };
  const { id, ...rest } = enquiry;
  await (await collection()).insertOne({ _id: id, ...rest });
  return enquiry;
}

export async function listEnquiries(): Promise<Enquiry[]> {
  return (await (await collection()).find().sort({ createdAt: -1 }).toArray()).map(map);
}
