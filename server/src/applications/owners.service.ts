import { DrizzleApplicationsRepository } from "./applications.repository";

export class OwnersService {
  private repo = new DrizzleApplicationsRepository();

  async createOwner(applicationId: string, payload: any) {
    if (!payload.email) {
      throw new Error("Owner email is required");
    }

    return this.repo.createOwner(applicationId, {
      email: payload.email,
      firstName: payload.firstName ?? "",
      lastName: payload.lastName ?? "",
      phone: payload.phone ?? "",
      address: payload.address ?? "",
      city: payload.city ?? "",
      state: payload.state ?? "",
      zip: payload.zip ?? "",
      dob: payload.dob ?? "",
      ssn: payload.ssn ?? "",
      ownershipPercentage: payload.ownershipPercentage ?? 0,
    });
  }
}
