const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldFormSection = `                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Nome do Projeto</label>
                  <input
                    type="text"
                    value={projectData.name}
                    onChange={e => setProjectData({...projectData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Tipologia do Negócio</label>
                  <select
                    value={projectData.type}
                    onChange={e => setProjectData({...projectData, type: e.target.value})}
                    className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option>Venda de produto específico</option>
                    <option>Venda de produtos diversos</option>
                    <option>Prestação de serviços</option>
                    <option>Start-up</option>
                  </select>
                </div>`;

const newFormSection = `                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Nome do Projeto</label>
                    <input
                      type="text"
                      value={projectData.name}
                      onChange={e => setProjectData({...projectData, name: e.target.value})}
                      className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Nome do Autor do Projeto</label>
                    <input
                      type="text"
                      value={projectData.authorName}
                      onChange={e => setProjectData({...projectData, authorName: e.target.value})}
                      className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Tipologia do Negócio</label>
                    <select
                      value={projectData.type}
                      onChange={e => setProjectData({...projectData, type: e.target.value})}
                      className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    >
                      <option>Venda de produto específico</option>
                      <option>Venda de produtos diversos</option>
                      <option>Prestação de serviços</option>
                      <option>Start-up</option>
                    </select>
                  </div>
                  {projectData.type === 'Venda de produto específico' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Nome do Produto Específico</label>
                      <input
                        type="text"
                        value={projectData.specificProductName}
                        onChange={e => setProjectData({...projectData, specificProductName: e.target.value})}
                        className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Localização</label>
                  <input
                    type="text"
                    value={projectData.location}
                    onChange={e => setProjectData({...projectData, location: e.target.value})}
                    className="w-full px-4 py-2 bg-[#0a0763] border border-[#140242] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>`;

code = code.replace(oldFormSection, newFormSection);
fs.writeFileSync('src/App.tsx', code);
