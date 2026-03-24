const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const DEFAULT_OWNER_PASSWORD = process.env.DEFAULT_OWNER_PASSWORD || "Syndic1234";

async function findUserByEmail(email) {
  const exact = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      passwordHash: true,
      isActive: true,
    },
  });

  if (exact) {
    return exact;
  }

  return prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      email: true,
      role: true,
      passwordHash: true,
      isActive: true,
    },
  });
}

async function ensureOwnerAccount(owner) {
  const cleanEmail = owner.email.trim().toLowerCase();
  let createdUser = false;
  let linkedOwner = false;
  let createdMembership = false;
  let initializedPassword = false;

  let user = await findUserByEmail(cleanEmail);

  if (!user) {
    const passwordHash = await bcrypt.hash(DEFAULT_OWNER_PASSWORD, 12);
    try {
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: `${owner.firstName || ""} ${owner.name}`.trim() || cleanEmail,
          passwordHash,
          role: "OWNER",
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          role: true,
          passwordHash: true,
          isActive: true,
        },
      });
      createdUser = true;
      initializedPassword = true;
    } catch (error) {
      if (error && error.code === "P2002") {
        user = await findUserByEmail(cleanEmail);
      } else {
        throw error;
      }
    }
  } else if (!user.passwordHash) {
    const passwordHash = await bcrypt.hash(DEFAULT_OWNER_PASSWORD, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        isActive: true,
        role: user.role === "OWNER" ? user.role : user.role,
      },
    });
    initializedPassword = true;
  }

  const membership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: owner.organizationId,
      },
    },
    select: { userId: true },
  });

  if (!membership) {
    await prisma.userOrganization.create({
      data: {
        userId: user.id,
        organizationId: owner.organizationId,
        role: "OWNER",
      },
    });
    createdMembership = true;
  }

  if (owner.userId !== user.id) {
    await prisma.owner.update({
      where: { id: owner.id },
      data: { userId: user.id },
    });
    linkedOwner = true;
  }

  return {
    ownerId: owner.id,
    email: cleanEmail,
    createdUser,
    createdMembership,
    linkedOwner,
    initializedPassword,
  };
}

async function main() {
  const owners = await prisma.owner.findMany({
    where: {
      email: {
        not: null,
      },
    },
    select: {
      id: true,
      organizationId: true,
      email: true,
      firstName: true,
      name: true,
      userId: true,
      organization: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ organizationId: "asc" }, { createdAt: "asc" }],
  });

  const eligibleOwners = owners.filter((owner) => owner.email && owner.email.trim());
  const results = [];

  for (const owner of eligibleOwners) {
    const result = await ensureOwnerAccount(owner);
    results.push({
      organization: owner.organization?.name || owner.organizationId,
      ...result,
    });
  }

  const summary = {
    scannedOwners: owners.length,
    eligibleOwners: eligibleOwners.length,
    createdUsers: results.filter((item) => item.createdUser).length,
    createdMemberships: results.filter((item) => item.createdMembership).length,
    linkedOwners: results.filter((item) => item.linkedOwner).length,
    initializedPasswords: results.filter((item) => item.initializedPassword).length,
    defaultPassword: DEFAULT_OWNER_PASSWORD,
  };

  console.log(JSON.stringify({ summary, results }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
