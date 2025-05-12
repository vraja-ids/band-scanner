class MemberDetails {
  constructor(data) {
    this.memberId = data.memberId;
    this.legalName = data.legalName;
    this.spiritualName = data.spiritualName;
    this.isSPDisciple = data.isSPDisciple;
    this.requestedActivity = data.requestedActivity;
    this.totalCount = data.totalCount || 0;
    this.sponsorAmount = data.sponsorAmount || 0;
    this.registrationType = data.registrationType;
    this.mealOption = data.mealOption || '';
    this.servicesOffered = data.servicesOffered || '';
    this.giftDetails = this.parseGiftDetails(data.giftDetails);
    this.giftStatus = data.giftStatus || [];
  }

  parseGiftDetails(giftDetails) {
    if (!giftDetails || !Array.isArray(giftDetails)) return [];
    return giftDetails.map(detail => {
      const giftObj = {};
      // Dynamically get all gift keys from the detail object
      Object.keys(detail).forEach(key => {
        if (key.startsWith('Gift')) {
          giftObj[key.toLowerCase()] = detail[key] || '';
        }
      });
      return giftObj;
    });
  }

  getDisplayName() {
    return this.spiritualName || this.legalName;
  }
}

export default MemberDetails; 