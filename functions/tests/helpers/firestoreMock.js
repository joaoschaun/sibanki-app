function createFirestoreMock(initialDocs = {}) {
  const docs = new Map(Object.entries(initialDocs));
  const operations = { sets: [], batchSets: [], commits: 0 };

  function getPath(parts) {
    return parts.filter(Boolean).join("/");
  }

  function getDocSnapshot(path) {
    const value = docs.get(path);
    return {
      id: path.split("/").pop(),
      exists: value !== undefined,
      data: () => (value === undefined ? undefined : value),
      ref: makeDocRef(path),
    };
  }

  function makeCollectionRef(path) {
    return {
      doc(id) {
        const nextId = id || `auto_${Math.random().toString(36).slice(2, 8)}`;
        return makeDocRef(getPath([path, nextId]));
      },
      where(field, op, target) {
        return {
          limit(n) {
            return {
              async get() {
                const matched = [];
                for (const [docPath, value] of docs.entries()) {
                  if (!docPath.startsWith(`${path}/`)) continue;
                  const depth = docPath.slice(path.length + 1).split("/").length;
                  if (depth !== 1) continue;
                  if (op === "==" && value?.[field] === target) matched.push(getDocSnapshot(docPath));
                  if (op === "array-contains" && Array.isArray(value?.[field]) && value[field].includes(target)) {
                    matched.push(getDocSnapshot(docPath));
                  }
                }
                return { empty: matched.length === 0, docs: matched.slice(0, n) };
              },
            };
          },
        };
      },
      count() {
        return {
          async get() {
            let count = 0;
            for (const key of docs.keys()) {
              if (!key.startsWith(`${path}/`)) continue;
              const depth = key.slice(path.length + 1).split("/").length;
              if (depth === 1) count += 1;
            }
            return { data: () => ({ count }) };
          },
        };
      },
      async get() {
        const out = [];
        for (const [docPath] of docs.entries()) {
          if (!docPath.startsWith(`${path}/`)) continue;
          const depth = docPath.slice(path.length + 1).split("/").length;
          if (depth === 1) out.push(getDocSnapshot(docPath));
        }
        return {
          empty: out.length === 0,
          docs: out,
          size: out.length,
          forEach(cb) {
            out.forEach(cb);
          },
        };
      },
    };
  }

  function makeDocRef(path) {
    return {
      id: path.split("/").pop(),
      async get() {
        return getDocSnapshot(path);
      },
      async set(data, options = {}) {
        const current = docs.get(path) || {};
        const next = options.merge ? { ...current, ...data } : data;
        docs.set(path, next);
        operations.sets.push({ path, data: next, options });
      },
      async delete() {
        docs.delete(path);
      },
      collection(name) {
        return makeCollectionRef(getPath([path, name]));
      },
    };
  }

  return {
    collection(name) {
      return makeCollectionRef(name);
    },
    doc(path) {
      return makeDocRef(path);
    },
    async runTransaction(cb) {
      const tx = {
        async get(ref) {
          return ref.get();
        },
        set(ref, data, options) {
          return ref.set(data, options);
        },
      };
      return cb(tx);
    },
    batch() {
      const staged = [];
      return {
        set(ref, data, options) {
          staged.push({ ref, data, options });
          operations.batchSets.push({ path: ref.id ? null : null, data, options });
        },
        async commit() {
          for (const op of staged) {
            await op.ref.set(op.data, op.options);
          }
          operations.commits += 1;
        },
      };
    },
    __docs: docs,
    __operations: operations,
  };
}

module.exports = { createFirestoreMock };
